import { initializeApp } from "firebase/app";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyCjKgWusR2j9HBbmGRrLEhMDHUD6Iek2p8",
  authDomain: "saint-clothing.firebaseapp.com",
  projectId: "saint-clothing",
  storageBucket: "saint-clothing.firebasestorage.app",
  messagingSenderId: "423225587502",
  appId: "1:423225587502:web:7a2d72a591aff39a1b6cbf",
  measurementId: "G-MJLY272J6D"
};

const app = initializeApp(firebaseConfig);
const storage = getStorage(app);

export const uploadModelToFirebase = async (file) => {
  const fileRef = ref(storage, `models/${Date.now()}-${file.name}`);

  await uploadBytes(fileRef, file);

  const url = await getDownloadURL(fileRef);

  return url;
};