import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore, collection, getDocs, doc, getDoc, setDoc, deleteDoc, writeBatch, query, orderBy } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { firebaseConfig } from './config.js';

// Firebaseの初期化
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

/**
 * 全ての駅データを取得
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
 * 特定の列車データをFirestoreから取得
 * @param {string} trainId 列車番号
 * @param {Array} allStations 全駅リスト
 * @returns {Promise<Object>} 列車詳細と停車駅リスト
 */
export async function fetchTrainData(trainId, allStations) {
    const trainDocRef = doc(db, "trains", trainId);
    const trainDocSnap = await getDoc(trainDocRef);

    let trainDetails = {};
    let stopList = [];

    if (trainDocSnap.exists()) {
        trainDetails = trainDocSnap.data();
        for (const station of allStations) {
            const stationDocRef = doc(db, "stations", station.id);
            const stationDocSnap = await getDoc(stationDocRef);
            if (stationDocSnap.exists()) {
                const stopTrains = stationDocSnap.data().stop_trains || [];
                const foundStop = stopTrains.find(stop => stop.trainId === trainId);
                if (foundStop) {
                    stopList.push({ stationId: station.id, ...foundStop });
                }
            }
        }
    }
    return { trainDetails, stopList };
}

/**
 * 列車データをFirestoreに保存
 * @param {string} trainId 列車番号
 * @param {Object} trainData 列車詳細データ
 * @param {Array} stopList 停車駅リスト
 * @param {Array} allStations 全駅リスト
 */
export async function saveTrainData(trainId, trainData, stopList, allStations) {
    const batch = writeBatch(db);
    
    // 1. trainsコレクションに列車詳細を保存
    await setDoc(doc(db, "trains", trainId), trainData);

    // 2. stationsコレクションの各ドキュメントを更新
    for (const station of allStations) {
        const stationDocRef = doc(db, "stations", station.id);
        const stationDocSnap = await getDoc(stationDocRef);
        if (stationDocSnap.exists()) {
            let stopTrains = stationDocSnap.data().stop_trains || [];
            // いったん当該列車情報を削除
            const filteredStops = stopTrains.filter(s => s.trainId !== trainId);
            // 新しい停車情報があれば追加
            const newStop = stopList.find(s => s.stationId === station.id);
            if (newStop) {
                const { stationId, ...stopInfo } = newStop; // stationIdは不要なので除く
                filteredStops.push({ trainId, day: trainData.day, ...stopInfo });
            }
            batch.update(stationDocRef, { stop_trains: filteredStops });
        }
    }

    await batch.commit();
}

/**
 * 列車データをFirestoreから削除
 * @param {string} trainId 列車番号
 * @param {Array} allStations 全駅リスト
 */
export async function deleteTrainData(trainId, allStations) {
    const batch = writeBatch(db);

    // 1. trainsコレクションから削除
    await deleteDoc(doc(db, "trains", trainId));

    // 2. stationsコレクションの各停車情報から削除
    for (const station of allStations) {
        const stationDocRef = doc(db, "stations", station.id);
        const stationDocSnap = await getDoc(stationDocRef);
        if (stationDocSnap.exists()) {
            let stopTrains = stationDocSnap.data().stop_trains || [];
            if (stopTrains.some(s => s.trainId === trainId)) {
                const filteredStops = stopTrains.filter(s => s.trainId !== trainId);
                batch.update(stationDocRef, { stop_trains: filteredStops });
            }
        }
    }
    
    await batch.commit();
}