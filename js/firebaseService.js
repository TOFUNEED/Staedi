import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore, collection, getDocs, doc, getDoc, setDoc, deleteDoc, writeBatch, query, orderBy } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
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
 * @param {Array} allStations - 全駅データのリスト
 * @returns {Promise<Object>} { trainDetails, stopList } を含むオブジェクト
 */
export async function fetchTrainData(trainId, allStations) {
    const trainDocRef = doc(db, "trains", trainId);
    const trainDocSnap = await getDoc(trainDocRef);

    let trainDetails = {};
    let stopList = [];

    if (trainDocSnap.exists()) {
        trainDetails = trainDocSnap.data();
        // 各駅のドキュメントを調べて、この列車が停車する情報を集める
        for (const station of allStations) {
            const stationDocRef = doc(db, "stations", station.id);
            const stationDocSnap = await getDoc(stationDocRef);
            if (stationDocSnap.exists()) {
                const stopTrains = stationDocSnap.data().stop_trains || [];
                const foundStop = stopTrains.find(stop => stop.trainId === trainId);
                if (foundStop) {
                    stopList.push({ 
                        stationId: station.id,
                        time: foundStop.time,
                        time_arrival: foundStop.time_arrival,
                        platform_arrival: foundStop.platform_arrival,
                        platform_departure: foundStop.platform_departure,
                        next_trainId: foundStop.next_trainId,
                    });
                }
            }
        }
    }
    return { trainDetails, stopList };
}

/**
 * 列車データをFirestoreに保存（新規作成または上書き）する
 * @param {string} trainId - 保存する列車の番号
 * @param {Object} trainData - 列車の基本情報
 * @param {Array} stopList - その列車の停車駅情報リスト
 * @param {Array} allStations - 全駅データのリスト
 */
export async function saveTrainData(trainId, trainData, stopList, allStations) {
    const batch = writeBatch(db);
    
    // 1. `trains`コレクションに列車の基本情報を保存
    await setDoc(doc(db, "trains", trainId), trainData);

    // 2. 全ての`stations`ドキュメントを更新し、この列車の停車情報を反映させる
    for (const station of allStations) {
        const stationDocRef = doc(db, "stations", station.id);
        const stationDocSnap = await getDoc(stationDocRef);
        if (stationDocSnap.exists()) {
            let stopTrains = stationDocSnap.data().stop_trains || [];
            
            // いったん、この列車の古い情報をリストから削除する
            const filteredStops = stopTrains.filter(s => s.trainId !== trainId);
            
            // 新しい停車情報があれば、リストに追加する
            const newStop = stopList.find(s => s.stationId === station.id);
            if (newStop) {
                const { stationId, ...stopInfo } = newStop; // stationIdは不要なので除く
                const stopDataToSave = {
                    trainId,
                    day: trainData.day,
                    time: stopInfo.time, // 出発時刻
                    // 値が存在する場合のみプロパティを追加（三項演算子）
                    ...(stopInfo.time_arrival && { time_arrival: stopInfo.time_arrival }),
                    ...(stopInfo.platform_arrival && { platform_arrival: stopInfo.platform_arrival }),
                    ...(stopInfo.platform_departure && { platform_departure: stopInfo.platform_departure }),
                    ...(stopInfo.next_trainId && { next_trainId: stopInfo.next_trainId }),
                };
                filteredStops.push(stopDataToSave);
            }
            batch.update(stationDocRef, { stop_trains: filteredStops });
        }
    }

    await batch.commit();
}

/**
 * 列車データをFirestoreから完全に削除する
 * @param {string} trainId - 削除する列車の番号
 * @param {Array} allStations - 全駅データのリスト
 */
export async function deleteTrainData(trainId, allStations) {
    const batch = writeBatch(db);

    // 1. `trains`コレクションから列車の基本情報を削除
    await deleteDoc(doc(db, "trains", trainId));

    // 2. 全ての`stations`ドキュメントを更新し、この列車の停車情報を削除する
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