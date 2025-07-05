# **App Name**: MeetingSync

## Core Features:

- Meeting Creation: Create new Zoom meetings with customizable settings (meeting title, date, time, duration, participants, description(optional)).
- Meeting List: View upcoming and past meetings in a clear, sortable list with essential details.
- Meeting Edit: Edit existing meeting details, such as time, participants, and settings. User role-based edit permissions.
- User Management: Allow multiple users to access MeetingSync to manage meetings; role assignment will gate different permission levels.
- Load Balancing: Automatically distribute newly scheduled meetings across multiple linked Zoom accounts to prevent overload. Choose the least utilized Zoom account based on scheduling data, balancing the load for optimal resource utilization and reliability.
- Authentication: Secure user authentication to protect meeting data and user privacy.
- Zod Validation: Use Zod for schema validation to ensure data integrity and type safety throughout the application.
- Zustand State Management: Implement Zustand for state management to efficiently handle application state and data flow.
- Prisma SQLite Database: Use Prisma with SQLite for database interactions.

## Style Guidelines:

- Primary color: Deep purple (#673AB7) to evoke a sense of professionalism and trust.
- Background color: Light gray (#F5F5F5) for a clean, neutral backdrop.
- Accent color: Light purple (#9575CD) to complement the primary, for highlights and interactive elements.
- Body text: 'Inter' (sans-serif) for readability and a modern, professional look.
- Headline text: 'Space Grotesk' (sans-serif) for short headlines; if longer text is anticipated, use this for headlines and 'Inter' for body
- Use a set of consistent, professional icons to represent meeting actions and statuses. Flat design style.
- Emphasize clean and intuitive layout, to focus on clarity. Use well-defined sections and clear visual hierarchy to help guide users.
- Use subtle transitions and animations to provide feedback on interactions.