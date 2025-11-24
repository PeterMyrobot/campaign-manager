import { collection, getDocs, orderBy, query } from "firebase/firestore";
import { db } from "./firebase";

const COLLECTION_NAME = 'campaigns';


export const campaignService = {
  
  // Get all campaigns
  async getAll() {
    const querySnapshot = await getDocs(
      query(collection(db, COLLECTION_NAME), orderBy('createdAt', 'desc'))
    );
    return querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      startDate: doc.data().startDate?.toDate(),
      endDate: doc.data().endDate?.toDate(),
      createdAt: doc.data().createdAt?.toDate(),
      updatedAt: doc.data().updatedAt?.toDate(),
    }));
  },
}