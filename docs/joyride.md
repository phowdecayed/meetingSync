# Joyride Tour Implementation Plan

This document outlines the plan for implementing a feature tour using `react-joyride`.

## Tour Steps

The guided tour will walk the user through the following key features of the application:

1.  **Dashboard Overview**
    *   **Target Element:** The main content area of the dashboard.
    *   **Selector:** `main[role='main']`
    *   **Description:** A general welcome message introducing the user to the dashboard.

2.  **Sidebar Navigation**
    *   **Target Element:** The main sidebar navigation panel.
    *   **Selector:** `nav[aria-label='Sidebar']` (Assuming the sidebar component renders a `nav` tag with this label for accessibility, which is a good practice to add). If not, a simple `nav` might suffice if it's unique enough, or we can add a `data-testid='sidebar-nav'`.
    *   **Description:** Highlights the main navigation controls for moving between different sections of the app.

3.  **Create a New Meeting**
    *   **Target Element:** The "New Meeting" button in the header.
    *   **Selector:** `#new-meeting-button` (This ID will be added to the `Link` or `Button` component for a stable hook).
    *   **Description:** Points out the primary action button for scheduling a new meeting.

4.  **User Profile & Settings**
    *   **Target Element:** The user avatar dropdown menu trigger.
    *   **Selector:** `button[aria-haspopup='menu']` (This is a common selector for dropdown triggers). We can also add a `data-testid='user-avatar-button'`.
    *   **Description:** Shows the user where they can access their profile, settings, and log out. This is also where the tour can be re-initiated.

## Implementation Details

-   **State Management:** Zustand will be used to manage the tour's state (`run`, `stepIndex`, `steps`). A new store will be created at `src/store/use-tour-store.ts`.
-   **Tour Component:** A wrapper component, `TourProvider`, will be created to house the `Joyride` component and its configuration.
-   **Trigger:** A new item, "Start Tour," will be added to the user's avatar dropdown menu. Clicking this will initiate the tour.
-   **Styling:** The tour will use the default styling but can be customized later to match the application's theme.
