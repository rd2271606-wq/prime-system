// Official Firebase Configuration for PRIME SYSTEM
const firebaseConfig = {
  apiKey: "AIzaSyDvyYyeyGNvNh09WzV-mc7YDIOYYRohTvs",
  authDomain: "primesystem-30ccb.firebaseapp.com",
  projectId: "primesystem-30ccb",
  storageBucket: "primesystem-30ccb.firebasestorage.app",
  messagingSenderId: "312358690899",
  appId: "1:312358690899:web:6b406f592ea950dc14a6a6",
  measurementId: "G-GYZ62Z5RBL"
};

// Initialize Firebase App
if (typeof firebase !== 'undefined' && !firebase.apps.length) {
  try {
    firebase.initializeApp(firebaseConfig);
    console.log("Firebase App Initialized successfully for PRIME SYSTEM!");
  } catch (e) {
    console.warn("Firebase Init Error:", e.message);
  }
}
