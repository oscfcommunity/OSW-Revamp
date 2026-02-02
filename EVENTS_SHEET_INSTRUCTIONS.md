**Yes, we can absolutely use Google Sheets!** 📊

It's the easiest way to manage both events and jobs in one place. You can create a second tab in your existing sheet (e.g., named "Events") or use a new sheet.

### Required Data (Columns)
Please create a sheet with these headers (exact spelling helps):

1.  **title**: Event Name (e.g., "_GDG DevFest 2025_")
2.  **startDate**: Start time (ISO format preferred, e.g., `2025-11-15T10:00:00` or just `2025-11-15`)
3.  **endDate**: End time
4.  **link**: Registration/Info URL
5.  **location**: (Optional) City or "Online"
6.  **type**: (Optional) e.g., "Meetup", "Workshop", "Conference"
7.  **description**: (Optional) A brief summary of the event.

> **Note on Past Events**: You **do not** need a separate column to mark events as "past". The website automatically checks the `endDate`. If the date has passed, it will automatically move to the "Past Events" section. 🚀

### Next Steps:
1.  **Create the Sheet** and add some dummy rows.
2.  **Publish it** to CSV (exactly like you did for Jobs) and get the link.
3.  **Share the URL** with me (or update your `.env` if you know how), and I'll wire up the code to fetch events dynamically!
