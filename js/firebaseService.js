import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore, collection, getDocs, doc, getDoc, setDoc, deleteDoc, query, orderBy } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { firebaseConfig } from './config.js';

// Firebaseの初期化
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

/**
 * Firestoreから全ての駅データを取得する
 * @returns {Promise<Array>} 駅データの配列
 */
export async function getAllStations() {
    const stations = [];
    const q = query(collection(db, "stations"), orderBy("order", "asc"));
    const snapshot = await getDocs(q);
    snapshot.forEach(doc => {
        stations.push({ id: doc.id, ...doc.data() });
    });
    return stations;
}

/**
 * Firestoreから全ての列車のIDと方面を取得する
 * @returns {Promise<Array>} {id, direction} のオブジェクトの配列
 */
export async function fetchAllTrainIds() {
    const trains = [];
    const trainsCollection = collection(db, "trains");
    const snapshot = await getDocs(trainsCollection);
    snapshot.forEach(doc => {
        trains.push({
            id: doc.id,
            direction: doc.data().direction
        });
    });
    // ID（列車番号）でソートして返す
    return trains.sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }));
}

/**
 * 特定の列車データをFirestoreから取得する
 * @param {string} trainId - 取得したい列車の番号
 * @returns {Promise<Object|null>} 列車データオブジェクト、存在しない場合はnull
 */
export async function fetchTrainData(trainId) {
    const trainDocRef = doc(db, "trains", trainId);
    const trainDocSnap = await getDoc(trainDocRef);

    if (trainDocSnap.exists()) {
        return trainDocSnap.data();
    } else {
        return null; // データが存在しない
    }
}

/**
 * 列車データをFirestoreに保存（新規作成または上書き）する
 * @param {string} trainId - 保存する列車の番号
 * @param {Object} trainData - 保存する完全な列車データオブジェクト
 */
export async function saveTrainData(trainId, trainData) {
    const trainDocRef = doc(db, "trains", trainId);
    await setDoc(trainDocRef, trainData);
}

/**
 * 列車データをFirestoreから完全に削除する
 * @param {string} trainId - 削除する列車の番号
 */
export async function deleteTrainData(trainId) {
    const trainDocRef = doc(db, "trains", trainId);
    await deleteDoc(trainDocRef);
}