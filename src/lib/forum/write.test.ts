import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';

import { createTestDatabase, type TestDatabase } from '../../../tests/helpers/db';
import { user } from '../../db/schema/auth';
import { forumPost, forumThread } from '../../db/schema/forum';
import { castVote, createReply, createThread, setPostStatus } from './write';
import { ensureCategories, getCategory, listPosts } from './repo';

const anAuthor = async (db: TestDatabase, id: string) => {
  await db.insert(user).values({ id, name: `User ${id}`, email: `${id}@osw.test` });
  return id;
};

describe('forum writes', () => {
  let db: TestDatabase;
  let close: () => Promise<void>;
  let categoryId: number;

  beforeEach(async () => {
    ({ db, close } = await createTestDatabase());
    await ensureCategories(db);
    const category = await getCategory(db, 'general');
    categoryId = category!.id;
  });

  afterEach(async () => {
    await close();
  });

  describe('createThread', () => {
    it('creates a thread with its opening post', async () => {
      const authorId = await anAuthor(db, 'author-1');

      const created = await createThread(db, {
        categoryId,
        authorId,
        title: 'How do I contribute to OSW?',
        body: 'I would like to help with the website. Where do I start?',
      });

      expect(created.slug).toMatch(/^how-do-i-contribute-to-osw-/);

      const { posts, totalCount } = await listPosts(db, created.id);
      expect(totalCount).toBe(1);
      expect(posts[0]?.isFirstPost).toBe(true);
      expect(posts[0]?.bodyHtml).toContain('<p>I would like to help');
    });

    it('sanitizes the opening post at write time', async () => {
      const authorId = await anAuthor(db, 'author-1');

      const created = await createThread(db, {
        categoryId,
        authorId,
        title: 'A hostile post',
        body: 'Hello <script>alert(1)</script> and <img src=x onerror=alert(1)>',
      });

      const { posts } = await listPosts(db, created.id);
      expect(posts[0]?.bodyHtml).not.toContain('<script');
      expect(posts[0]?.bodyHtml).not.toContain('onerror');
    });

    it('starts a thread with no replies and its activity timestamp set', async () => {
      const authorId = await anAuthor(db, 'author-1');
      const created = await createThread(db, {
        categoryId,
        authorId,
        title: 'Fresh thread',
        body: 'Body of the thread goes here.',
      });

      const [row] = await db.select().from(forumThread).where(eq(forumThread.id, created.id));
      expect(row?.replyCount).toBe(0);
      expect(row?.lastPostAt).toBeInstanceOf(Date);
      expect(row?.lastPostBy).toBe(authorId);
    });
  });

  describe('createReply', () => {
    it('increments the denormalised reply count and moves the activity timestamp', async () => {
      const authorId = await anAuthor(db, 'author-1');
      const replierId = await anAuthor(db, 'author-2');
      const thread = await createThread(db, {
        categoryId,
        authorId,
        title: 'Thread with replies',
        body: 'Opening post body.',
      });

      await createReply(db, { threadId: thread.id, authorId: replierId, body: 'First reply.' });
      await createReply(db, { threadId: thread.id, authorId: replierId, body: 'Second reply.' });

      const [row] = await db.select().from(forumThread).where(eq(forumThread.id, thread.id));
      expect(row?.replyCount).toBe(2);
      expect(row?.lastPostBy).toBe(replierId);

      const { totalCount } = await listPosts(db, thread.id);
      expect(totalCount).toBe(3);
    });

    it('refuses to reply to a locked thread', async () => {
      const authorId = await anAuthor(db, 'author-1');
      const thread = await createThread(db, {
        categoryId,
        authorId,
        title: 'Locked thread',
        body: 'Opening post body.',
      });
      await db.update(forumThread).set({ isLocked: true }).where(eq(forumThread.id, thread.id));

      await expect(
        createReply(db, { threadId: thread.id, authorId, body: 'Sneaky reply.' }),
      ).rejects.toThrow(/locked/i);
    });
  });

  describe('castVote', () => {
    it('records an upvote and reflects it in the post score', async () => {
      const authorId = await anAuthor(db, 'author-1');
      const voterId = await anAuthor(db, 'voter-1');
      const thread = await createThread(db, {
        categoryId,
        authorId,
        title: 'Votable thread',
        body: 'Opening post body.',
      });
      const { posts } = await listPosts(db, thread.id);
      const postId = posts[0]!.id;

      await castVote(db, { postId, userId: voterId, value: 1 });

      const [row] = await db.select().from(forumPost).where(eq(forumPost.id, postId));
      expect(row?.voteScore).toBe(1);
    });

    it('replaces a previous vote by the same person instead of stacking', async () => {
      const authorId = await anAuthor(db, 'author-1');
      const voterId = await anAuthor(db, 'voter-1');
      const thread = await createThread(db, {
        categoryId,
        authorId,
        title: 'Votable thread',
        body: 'Opening post body.',
      });
      const { posts } = await listPosts(db, thread.id);
      const postId = posts[0]!.id;

      await castVote(db, { postId, userId: voterId, value: 1 });
      await castVote(db, { postId, userId: voterId, value: -1 });

      const [row] = await db.select().from(forumPost).where(eq(forumPost.id, postId));
      expect(row?.voteScore).toBe(-1);
    });

    it('removes the vote when the same value is cast again', async () => {
      const authorId = await anAuthor(db, 'author-1');
      const voterId = await anAuthor(db, 'voter-1');
      const thread = await createThread(db, {
        categoryId,
        authorId,
        title: 'Votable thread',
        body: 'Opening post body.',
      });
      const { posts } = await listPosts(db, thread.id);
      const postId = posts[0]!.id;

      await castVote(db, { postId, userId: voterId, value: 1 });
      await castVote(db, { postId, userId: voterId, value: 1 });

      const [row] = await db.select().from(forumPost).where(eq(forumPost.id, postId));
      expect(row?.voteScore).toBe(0);
    });

    it('refuses a vote on the voter’s own post', async () => {
      const authorId = await anAuthor(db, 'author-1');
      const thread = await createThread(db, {
        categoryId,
        authorId,
        title: 'Self vote',
        body: 'Opening post body.',
      });
      const { posts } = await listPosts(db, thread.id);

      await expect(
        castVote(db, { postId: posts[0]!.id, userId: authorId, value: 1 }),
      ).rejects.toThrow(/own post/i);
    });
  });

  describe('setPostStatus', () => {
    it('hides a post without deleting it, and keeps the reply count honest', async () => {
      const authorId = await anAuthor(db, 'author-1');
      const moderatorId = await anAuthor(db, 'mod-1');
      const thread = await createThread(db, {
        categoryId,
        authorId,
        title: 'Moderated thread',
        body: 'Opening post body.',
      });
      await createReply(db, { threadId: thread.id, authorId, body: 'A reply to hide.' });

      const { posts } = await listPosts(db, thread.id);
      const reply = posts.find((post) => !post.isFirstPost)!;

      await setPostStatus(db, { postId: reply.id, status: 'hidden', actorId: moderatorId });

      const [stored] = await db.select().from(forumPost).where(eq(forumPost.id, reply.id));
      expect(stored?.status).toBe('hidden');
      expect(stored?.bodyMd).toBe('A reply to hide.');

      const [threadRow] = await db.select().from(forumThread).where(eq(forumThread.id, thread.id));
      expect(threadRow?.replyCount).toBe(0);

      const visible = await listPosts(db, thread.id);
      expect(visible.posts.some((post) => post.id === reply.id)).toBe(false);
    });
  });
});
