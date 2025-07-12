# Skill Swap Platform

## Live Demo
You can view the live application here: [https://odoo-57c97.web.app/](https://odoo-57c97.web.app/)

## Project Description
A web application built with React, Firebase (Authentication, Firestore), and Tailwind CSS that allows users to create profiles, list skills they can offer, and skills they want to learn. Users can browse other public profiles to find potential skill-swapping partners.

## Features
* User Profile Creation (Name, Location, Profile Photo URL)
* **Skills Offered:** Users can list skills they are proficient in.
* **Skills Wanted:** Users can list skills they wish to learn.
* Public Profile Visibility Toggle.
* Browse Public User Profiles: View other users' names, locations, and listed skills.
* Responsive UI with a colorful design using Tailwind CSS.
* Anonymous Authentication for easy onboarding.
* Data persistence using Firebase Firestore.

## Technologies Used
* **Frontend:** React.js
* **Styling:** Tailwind CSS
* **Backend/Database/Auth:** Google Firebase (Firestore, Authentication, Hosting)
* **Package Manager:** npm

## Setup and Local Development

To run this project locally, follow these steps:

1.  **Clone the repository:**
    ```bash
    git clone [https://github.com/AnanthaBhalan/Skill-swap-platform.git](https://github.com/AnanthaBhalan/Skill-swap-platform.git)
    cd Skill-swap-platform
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Firebase Project Setup:**
    * Go to [Firebase Console](https://console.firebase.google.com/) and create a new project.
    * **Enable Firestore Database:** In the Firebase Console, navigate to `Build` > `Firestore Database` and click "Create database". Choose "Start in test mode" for quick setup.
    * **Update Firestore Security Rules:** Go to `Build` > `Firestore Database` > `Rules` tab and replace the rules with:
        ```firestore
        rules_version = '2';
        service cloud.firestore {
          match /databases/{database}/documents {
            match /artifacts/{appId}/public/data/users/{userId} {
              allow read: if request.auth != null;
              allow write: if request.auth != null && request.auth.uid == userId;
            }
          }
        }
        ```
        Click "Publish".
    * **Enable Anonymous Authentication:** Go to `Build` > `Authentication` > `Sign-in method` tab. Find "Anonymous", click the pencil icon, enable it, and click "Save".
    * **Get Firebase Configuration:** Go to `Project settings` (gear icon) > `Your apps` section. If you haven't added a web app, click `</>` to add one. Copy the `firebaseConfig` object provided.

4.  **Update `src/App.js` with your Firebase Config:**
    * Open `src/App.js`.
    * Find the `const firebaseConfig = { ... };` block.
    * **Replace the placeholder values** with your actual `apiKey`, `authDomain`, `projectId`, etc., that you copied from the Firebase Console.
        ```javascript
        const firebaseConfig = {
          apiKey: "YOUR_API_KEY_HERE",
          authDomain: "YOUR_AUTH_DOMAIN_HERE",
          projectId: "YOUR_PROJECT_ID_HERE",
          storageBucket: "YOUR_STORAGE_BUCKET_HERE",
          messagingSenderId: "YOUR_MESSAGING_SENDER_ID_HERE",
          appId: "YOUR_APP_ID_HERE",
          // measurementId: "YOUR_MEASUREMENT_ID_HERE" // Include if present
        };
        ```

5.  **Run the application locally:**
    ```bash
    npm start
    ```
    The app will open in your browser, usually at `http://localhost:3000`.

## Deployment (Optional)
To deploy updates to the live site:
1.  Ensure you have Firebase CLI installed: `npm install -g firebase-tools`
2.  Log in: `firebase login`
3.  Build for production: `npm run build`
4.  Deploy: `firebase deploy --only hosting`

## Future Enhancements
* Implement robust search and filtering for skills.
* Develop a "Swap Request" system with status tracking.
* User profiles with more detailed information and skill endorsements.
* Real-time notifications for swap requests.