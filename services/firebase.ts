import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";
import { getStorage } from "firebase/storage";
import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyAiNEWKhQQsJsWjrmTziiwA83pmKz_jBV4",
  authDomain: "mas-tech-123.firebaseapp.com",
  databaseURL: "https://mas-tech-123-default-rtdb.firebaseio.com",
  projectId: "mas-tech-123",
  storageBucket: "mas-tech-123.firebasestorage.app",
  messagingSenderId: "882849023773",
  appId: "1:882849023773:web:27ff72c0edb053959103f4",
  measurementId: "G-DK9N23NS33"
};

const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);
export const storage = getStorage(app);
export const analytics = typeof window !== 'undefined' ? getAnalytics(app) : null;
