/**
 * Development fixture: fills the forum with members, threads, replies and votes
 * so the UI can be reviewed in a realistic state rather than an empty one.
 *
 *   npm run seed:forum
 *
 * Refuses to run against a database that already has threads unless --force is
 * passed, and refuses outright when NODE_ENV is production.
 *
 * PGlite allows a single process at a time, so stop the dev server first.
 */
import { randomUUID } from 'node:crypto';
import { count, eq } from 'drizzle-orm';

import { db } from '../src/db';
import { user } from '../src/db/schema/auth';
import { profile } from '../src/db/schema/community';
import { forumPost, forumThread } from '../src/db/schema/forum';
import { ensureCategories, getCategory } from '../src/lib/forum/repo';
import { claimUsername } from '../src/lib/username-claim';
import { castVote, createReply, createThread } from '../src/lib/forum/write';

const FORCE = process.argv.includes('--force');

if (process.env.NODE_ENV === 'production') {
  console.error('Refusing to seed a production database.');
  process.exit(1);
}

interface SeedMember {
  key: string;
  name: string;
  email: string;
  role: 'user' | 'moderator' | 'admin';
  bio: string;
  skills: string[];
}

const MEMBERS: readonly SeedMember[] = [
  {
    key: 'priya',
    name: 'Priya Sharma',
    email: 'priya@example.com',
    role: 'moderator',
    bio: 'Kernel tinkerer. Organises the Ahmedabad meetups.',
    skills: ['C', 'Linux', 'Git'],
  },
  {
    key: 'rahul',
    name: 'Rahul Mehta',
    email: 'rahul@example.com',
    role: 'user',
    bio: 'Backend developer, first-time contributor.',
    skills: ['TypeScript', 'Postgres'],
  },
  {
    key: 'ananya',
    name: 'Ananya Iyer',
    email: 'ananya@example.com',
    role: 'user',
    bio: 'Designer who keeps wandering into open source.',
    skills: ['Figma', 'CSS', 'Accessibility'],
  },
  {
    key: 'devang',
    name: 'Devang Patel',
    email: 'devang@example.com',
    role: 'user',
    bio: 'Student. Learning Rust the hard way.',
    skills: ['Rust', 'WebAssembly'],
  },
  {
    key: 'meera',
    name: 'Meera Nair',
    email: 'meera@example.com',
    role: 'user',
    bio: 'Hiring for a small platform team.',
    skills: ['Kubernetes', 'Go'],
  },
];

interface SeedThread {
  category: string;
  author: string;
  title: string;
  body: string;
  replies: { author: string; body: string }[];
  /** Members who upvote the opening post. */
  upvotes: string[];
  pinned?: boolean;
}

const THREADS: readonly SeedThread[] = [
  {
    category: 'announcements',
    author: 'priya',
    title: 'Welcome to the Open Source Weekend forum',
    pinned: true,
    body: `This is our new home for the conversations that used to scatter across WhatsApp and Twitter.

A few things worth knowing:

- **Be useful and be kind.** The Code of Conduct applies here exactly as it does at a meetup.
- Questions belong in **Help & Questions**, projects in **Show & Tell**.
- Markdown works, including \`code\` and fenced blocks.

See you at the next weekend.`,
    replies: [
      { author: 'rahul', body: 'Long overdue. The search alone makes this worth it.' },
      {
        author: 'ananya',
        body: 'Happy to help with the design side if anyone wants a second pair of eyes on a README or a landing page.',
      },
    ],
    upvotes: ['rahul', 'ananya', 'devang', 'meera'],
  },
  {
    category: 'general',
    author: 'rahul',
    title: 'How should we run the next hack weekend?',
    body: `Two formats keep coming up and I would like to settle it.

1. **Two days.** Saturday workshops, Sunday hacking.
2. **One long day**, with the workshops folded into the morning.

Two days gives beginners a gentler start, but attendance drops on the second morning. What has worked for other communities?`,
    replies: [
      {
        author: 'priya',
        body: 'Two days, but make Sunday explicitly optional. The people who show up on Sunday are the ones who ship something, and the drop-off stops being a failure if it was never the expectation.',
      },
      {
        author: 'devang',
        body: 'As someone who came to their first meetup last month: the workshop day is what got me in the door. I would not have turned up to a pure hacking day.',
      },
      {
        author: 'ananya',
        body: 'Agreed on two days. Could we also publish the agenda a week ahead? Turning up not knowing the plan is the main reason I skipped a few.',
      },
    ],
    upvotes: ['priya', 'devang', 'meera'],
  },
  {
    category: 'help',
    author: 'devang',
    title: 'Rust borrow checker is fighting me on a tree structure',
    body: `I am building a parse tree and every node needs a reference to its parent. The borrow checker refuses every version I write.

\`\`\`rust
struct Node {
    parent: Option<&Node>,
    children: Vec<Node>,
}
\`\`\`

I have read the book chapter twice. What is the idiomatic escape hatch here?`,
    replies: [
      {
        author: 'priya',
        body: `You want \`Rc<RefCell<Node>>\` for the children and \`Weak<RefCell<Node>>\` for the parent link.

The \`Weak\` is the important half: two \`Rc\`s pointing at each other never reach a refcount of zero, so the tree leaks. \`Weak\` does not keep the parent alive, which is exactly what you want, because a child should not.

If the tree is built once and never mutated, an arena is simpler still: keep a \`Vec<Node>\` and store \`usize\` indices instead of references. No lifetimes, no cycles, and it is what most real parsers do.`,
      },
      {
        author: 'devang',
        body: 'The arena approach worked. It is embarrassing how much simpler it is. Thank you.',
      },
    ],
    upvotes: ['rahul', 'ananya'],
  },
  {
    category: 'projects',
    author: 'ananya',
    title: 'Show and tell: an accessible date picker, no dependencies',
    body: `I got tired of shipping a 40 kB date picker to do something the platform nearly does already.

This one is about 3 kB, keyboard navigable, and announces properly in NVDA and VoiceOver. It degrades to a plain \`<input type="date">\` when JavaScript does not run.

Looking for testers, particularly anyone using a screen reader daily. I am fairly sure the month-change announcement is still too chatty.`,
    replies: [
      {
        author: 'meera',
        body: 'We may swap this into our onboarding flow. Does it handle non-Gregorian calendars, or is that out of scope?',
      },
      {
        author: 'ananya',
        body: 'Out of scope for now. `Intl.DateTimeFormat` gets most of the way there for display, but input parsing is where it gets genuinely hard.',
      },
    ],
    upvotes: ['priya', 'rahul', 'devang'],
  },
  {
    category: 'jobs-talk',
    author: 'meera',
    title: 'What do you actually want to see in an open source portfolio?',
    body: `I review a lot of CVs and the GitHub link is usually the least useful part: a wall of forks and tutorial repositories.

For those who hire: what makes a contribution history genuinely tell you something? And for those job hunting, what would you rather be asked about?`,
    replies: [
      {
        author: 'priya',
        body: "One merged pull request into something you did not start tells me more than thirty repositories you did. Reading someone else's code, matching their conventions and surviving review is the whole job.",
      },
      {
        author: 'rahul',
        body: 'From the other side: issue triage counts for more than people think. My first accepted contribution to a big project was a bug report with a reproduction, and it taught me more than the patch that followed.',
      },
    ],
    upvotes: ['rahul', 'devang'],
  },
];

const run = async (): Promise<void> => {
  const [existing] = await db.select({ value: count() }).from(forumThread);
  if ((existing?.value ?? 0) > 0 && !FORCE) {
    console.error(
      `The forum already has ${existing?.value} thread(s). Re-run with --force to add the fixture anyway.`,
    );
    process.exit(1);
  }

  await ensureCategories(db);

  const ids = new Map<string, string>();

  for (const member of MEMBERS) {
    const [row] = await db.select({ id: user.id }).from(user).where(eq(user.email, member.email));
    const id = row?.id ?? randomUUID();

    if (!row) {
      await db.insert(user).values({
        id,
        name: member.name,
        email: member.email,
        emailVerified: true,
        role: member.role,
      });
      await db.insert(profile).values({
        userId: id,
        bio: member.bio,
        skills: member.skills,
        location: 'Ahmedabad',
      });
    }

    await claimUsername(db, { id, name: member.name, email: member.email });

    ids.set(member.key, id);
    console.log(`member: ${member.name} <${member.email}> (${member.role})`);
  }

  for (const seed of THREADS) {
    const category = await getCategory(db, seed.category);
    if (!category) {
      console.warn(`skipping "${seed.title}": no category ${seed.category}`);
      continue;
    }

    const authorId = ids.get(seed.author)!;
    const thread = await createThread(db, {
      categoryId: category.id,
      authorId,
      title: seed.title,
      body: seed.body,
    });

    for (const reply of seed.replies) {
      await createReply(db, {
        threadId: thread.id,
        authorId: ids.get(reply.author)!,
        body: reply.body,
      });
    }

    if (seed.pinned) {
      await db.update(forumThread).set({ isPinned: true }).where(eq(forumThread.id, thread.id));
    }

    // Vote on the opening post, which is the first post in the thread.
    const [firstPost] = await db
      .select({ id: forumPost.id })
      .from(forumPost)
      .where(eq(forumPost.threadId, thread.id))
      .limit(1);

    if (firstPost) {
      for (const voter of seed.upvotes) {
        const voterId = ids.get(voter);
        if (voterId && voterId !== authorId) {
          await castVote(db, { postId: firstPost.id, userId: voterId, value: 1 });
        }
      }
    }

    console.log(`thread: ${seed.title} (${seed.replies.length} replies)`);
  }

  console.log(`\nSeeded ${MEMBERS.length} members and ${THREADS.length} threads.`);
  process.exit(0);
};

run().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
