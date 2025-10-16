import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore, collection, getDocs, doc, getDoc, setDoc, deleteDoc, writeBatch, query, orderBy } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// ...（firebaseConfig, standardIntervals, HTML要素の取得は変更なし）...
const firebaseConfig = {
    apiKey: "AIzaSyAG5BdEwEOZF6nft-9FYzdSOw3yAfHllwM",
    authDomain: "shinanopwa.firebaseapp.com",
    projectId: "shinanopwa",
    storageBucket: "shinanopwa.appspot.com",
    messagingSenderId: "65363009149",
    appId: "1:65363009149:web:8b683f5d2b86b0300cdb14",
    measurementId: "G-GXD4W4BKC8"
};
const standardIntervals = {
    down: {'karuizawa': 4, 'naka-karuizawa': 3, 'shinano-oiwake': 4, 'miyota': 4, 'hirahara': 4,'komoro': 3, 'shigeno': 3, 'tanaka': 3, 'ohya': 4, 'ueda': 3, 'nishi-ueda': 3,'sakaki-techno': 3, 'sakaki': 4, 'togura': 3, 'chikuma': 3, 'yashiro': 2, 'yashiro-koukou-mae': 4,'shinonoi': 3, 'imai': 3, 'kawanakajima': 3, 'amori': 3,'nagano': 3, 'kita-nagano': 3, 'sansai': 4, 'toyono': 6, 'mure': 5, 'furuma': 4, 'kurohime': 6},
    up: {'myoko-kogen': 6, 'kurohime': 4, 'furuma': 5, 'mure': 6, 'toyono': 4, 'sansai': 3, 'kita-nagano': 3,'nagano': 3, 'amori': 3, 'kawanakajima': 3, 'imai': 3,'shinonoi': 4, 'yashiro-koukou-mae': 2, 'yashiro': 3, 'chikuma': 3, 'togura': 4, 'sakaki': 3,'sakaki-techno': 3, 'nishi-ueda': 3, 'ueda': 4, 'ohya': 3, 'tanaka': 3, 'shigeno': 3,'komoro': 4, 'hirahara': 4, 'miyota': 4, 'shinano-oiwake': 3, 'naka-karuizawa': 4}
};
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const searchInput = document.getElementById('search-trainId');
const searchBtn = document.getElementById('search-btn');
const editArea = document.getElementById('edit-area');
const title = document.getElementById('current-trainId-title');
const form = document.getElementById('train-form');
const stationEditorTbody = document.getElementById('station-editor-tbody');
const setAllStopsBtn = document.getElementById('set-all-stops-btn');
const deleteTrainBtn = document.getElementById('delete-train-btn');
const copyBtn = document.getElementById('copy-btn');
const autoFillTimesBtn = document.getElementById('auto-fill-times-btn');

let allStations = [];
let currentTrainId = null;
let currentTrainData = {}; // ★現在の列車データを保持する

async function initializeStations() {
    const q = query(collection(db, "stations"), orderBy("order", "asc"));
    const snapshot = await getDocs(q);
    snapshot.forEach(doc => {
        allStations.push({ id: doc.id, ...doc.data() });
    });
}
function analyzeTrainId(trainId) {
    const match = trainId.match(/^(\d+)([A-Z])$/);
    if (!match) return { direction: null, company: null, directionText: '不明' };
    const number = parseInt(match[1], 10);
    const direction = (number % 2 === 0) ? 'up' : 'down';
    let company = '不明';
    if (match[2] === 'M') company = 'しなの鉄道';
    if (match[2] === 'D') company = 'JR飯山線';
    const directionText = direction === 'up' ? '上り (軽井沢方面)' : '下り (長野方面)';
    return { direction, company, directionText };
}
searchBtn.addEventListener('click', () => {
    const trainId = searchInput.value.trim().toUpperCase();
    if (trainId) {
        searchInput.value = trainId;
        loadTrainData(trainId);
    }
});

// ▼▼▼ 変更点：長野駅・小諸駅の追加データを読み込めるように修正 ▼▼▼
async function loadTrainData(trainId) {
    currentTrainId = trainId;
    currentTrainData = {}; // Reset
    title.textContent = `列車番号: ${trainId}`;
    form.reset();
    
    const analysis = analyzeTrainId(trainId);
    currentTrainData.analysis = analysis;
    document.getElementById('train-direction').value = analysis.directionText;
    document.getElementById('train-company').value = analysis.company || '不明';
    form.dataset.direction = analysis.direction;
    form.dataset.company = analysis.company;

    const sortedStations = analysis.direction === 'up' ? [...allStations].reverse() : allStations;
    
    const trainDocRef = doc(db, "trains", trainId);
    const trainDocSnap = await getDoc(trainDocRef);
    
    let currentStopList = [];
    if (trainDocSnap.exists()) {
        const data = trainDocSnap.data();
        currentTrainData.details = data; // ★列車詳細データを保持
        document.getElementById('train-type').value = data.type || '普通';
        document.getElementById('train-name').value = data.name || '';
        document.getElementById('train-destination').value = data.destination || '';
        document.getElementById('train-days').value = data.day || 'everyday';

        for (const station of allStations) {
            const stationDocRef = doc(db, "stations", station.id);
            const stationDocSnap = await getDoc(stationDocRef);
            if (stationDocSnap.exists()) {
                const stopTrains = stationDocSnap.data().stop_trains || [];
                const foundStop = stopTrains.find(stop => stop.trainId === trainId);
                if (foundStop) {
                    currentStopList.push({
                        stationId: station.id,
                        time: foundStop.time,
                        time_arrival: foundStop.time_arrival || null,
                        platform: foundStop.platform || null, // ★番線
                        next_trainId: foundStop.next_trainId || null // ★直通後列車番号
                    });
                }
            }
        }
    }
    renderStationEditor(sortedStations, currentStopList);
    editArea.style.display = 'block';
}

// ▼▼▼ 変更点：長野駅・小諸駅のUIを動的に変更 ▼▼▼
function renderStationEditor(stations, stopList) {
    stationEditorTbody.innerHTML = '';
    const company = form.dataset.company;
    const direction = form.dataset.direction;

    stations.forEach((station, index) => {
        const stopInfo = stopList.find(s => s.stationId === station.id);
        const tr = document.createElement('tr');
        
        let timeInputHtml = `<div class="time-and-details">`;
        let detailsHtml = '';

        // --- 駅ごとの特殊UI生成 ---
        if (company === 'JR飯山線' && station.id === 'toyono') {
            timeInputHtml += `
                着: <input type="time" class="stop-time-arrival" data-station-id="${station.id}" value="${stopInfo?.time_arrival || ''}">
                発: <input type="time" class="stop-time-departure" data-station-id="${station.id}" value="${stopInfo?.time || ''}">
            `;
        } else {
             timeInputHtml += `<input type="time" class="stop-time" data-station-id="${station.id}" value="${stopInfo?.time || ''}">`;
        }

        if (company === 'しなの鉄道') {
            if (station.id === 'nagano') {
                detailsHtml += `<input type="text" class="station-detail-input" data-station-id="${station.id}" data-type="next_trainId" placeholder="直通後 列車番号" value="${stopInfo?.next_trainId || ''}">`;
            }
            if (station.id === 'komoro') {
                let placeholder = "番線";
                // 小諸駅の番線推奨ロジック
                const isFirstStop = stopList.findIndex(s => s.stationId === 'komoro') === 0;
                const isLastStop = stopList.findIndex(s => s.stationId === 'komoro') === stopList.length - 1;

                if (direction === 'up' && !isLastStop) placeholder = "1 (推奨)"; // 上り直通
                else if (isLastStop) placeholder = "2 (推奨)"; // 終着
                else if (isFirstStop) placeholder = "3 (推奨)"; // 始発
                
                detailsHtml += `<input type="number" class="station-detail-input" data-station-id="${station.id}" data-type="platform" placeholder="${placeholder}" value="${stopInfo?.platform || ''}">`;
            }
        }
        // --- UI生成ここまで ---

        timeInputHtml += `${detailsHtml}</div>`;
        
        tr.innerHTML = `
            <td><input type="checkbox" class="stop-check" data-station-id="${station.id}" ${stopInfo ? 'checked' : ''}></td>
            <td>${station.name_jp}</td>
            <td>${timeInputHtml}</td>
        `;
        stationEditorTbody.appendChild(tr);
    });
}

// ...（setAllStopsBtn, autoFillTimesは変更なし）...
setAllStopsBtn.addEventListener('click', () => { /* ... */ });
autoFillTimesBtn.addEventListener('click', () => { /* ... */ });
function autoFillTimes() {
    const direction = form.dataset.direction;
    if (!direction || !standardIntervals[direction]) {
        alert("方面が不明なため、自動入力できません。");
        return;
    }
    const intervals = standardIntervals[direction];
    const rows = Array.from(stationEditorTbody.querySelectorAll('tr'));
    let firstTime = null;
    let firstTimeIndex = -1;
    for (let i = 0; i < rows.length; i++) {
        const timeInput = rows[i].querySelector('.stop-time') || rows[i].querySelector('.stop-time-departure');
        if (timeInput && timeInput.value) {
            const [hours, minutes] = timeInput.value.split(':').map(Number);
            firstTime = hours * 60 + minutes;
            firstTimeIndex = i;
            break;
        }
    }
    if (firstTimeIndex === -1) {
        alert("自動入力の起点となる駅の時刻を1つ以上入力してください。");
        return;
    }
    let currentTime = firstTime;
    for (let i = firstTimeIndex; i < rows.length - 1; i++) {
        const currentRow = rows[i];
        const nextRow = rows[i + 1];
        const currentCheckbox = currentRow.querySelector('.stop-check');
        const nextCheckbox = nextRow.querySelector('.stop-check');
        if (currentCheckbox.checked && nextCheckbox.checked) {
            const currentStationId = currentCheckbox.dataset.stationId;
            const interval = intervals[currentStationId];
            if (interval) {
                currentTime += interval;
                const newHours = Math.floor(currentTime / 60) % 24;
                const newMinutes = currentTime % 60;
                const newTimeString = `${String(newHours).padStart(2, '0')}:${String(newMinutes).padStart(2, '0')}`;
                const nextTimeInput = nextRow.querySelector('.stop-time') || nextRow.querySelector('.stop-time-departure');
                if (nextTimeInput) nextTimeInput.value = newTimeString;
            }
        } else {
            break;
        }
    }
}


// ▼▼▼ 変更点：長野駅・小諸駅の追加データを保存できるように修正 ▼▼▼
form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!currentTrainId) return;

    let currentStopList = [];
    stationEditorTbody.querySelectorAll('tr').forEach(tr => {
        const checkbox = tr.querySelector('.stop-check');
        if (checkbox.checked) {
            const stationId = checkbox.dataset.stationId;
            const stopData = { stationId };

            // 時刻の収集
            const timeInput = tr.querySelector('.stop-time');
            const arrivalInput = tr.querySelector('.stop-time-arrival');
            const departureInput = tr.querySelector('.stop-time-departure');
            if (departureInput) stopData.time = departureInput.value;
            if (timeInput) stopData.time = timeInput.value;
            if (arrivalInput) stopData.time_arrival = arrivalInput.value;

            // 詳細情報の収集
            tr.querySelectorAll('.station-detail-input').forEach(detailInput => {
                if (detailInput.value) {
                    stopData[detailInput.dataset.type] = detailInput.value; // "next_trainId" or "platform"
                }
            });

            if (stopData.time) {
                currentStopList.push(stopData);
            }
        }
    });

    // ... (trainDataの作成は同じ) ...
    const trainData = { /* ... */ };
    
    // ▼ Firestoreへの書き込みロジックを更新 ▼
    const batch = writeBatch(db);
    await setDoc(doc(db, "trains", currentTrainId), trainData);

    for (const station of allStations) {
        // ... (stationDocRef, stationDocSnapの取得は同じ) ...
        const stationDocRef = doc(db, "stations", station.id);
        const stationDocSnap = await getDoc(stationDocRef);

        if (stationDocSnap.exists()) {
            let stopTrains = stationDocSnap.data().stop_trains || [];
            const filteredStops = stopTrains.filter(s => s.trainId !== currentTrainId);
            const newStop = currentStopList.find(s => s.stationId === station.id);
            if (newStop) {
                // newStopオブジェクトにはtime, time_arrival, platform, next_trainIdなどが含まれる
                const stopDataToSave = {
                    trainId: currentTrainId,
                    day: trainData.day,
                    ...newStop // newStopの全プロパティを展開して追加
                };
                delete stopDataToSave.stationId; // 不要なプロパティを削除
                filteredStops.push(stopDataToSave);
            }
            batch.update(stationDocRef, { stop_trains: filteredStops });
        }
    }

    try {
        await batch.commit();
        alert(`列車番号「${currentTrainId}」の情報を保存しました。`);
    } catch (error) {
        console.error("保存エラー:", error);
        alert("保存に失敗しました。");
    }
});


// ...（copyBtn, deleteTrainBtn, initializeStationsの呼び出しは変更なし） ...
copyBtn.addEventListener('click', () => { /* ... */ });
deleteTrainBtn.addEventListener('click', () => { /* ... */ });

initializeStations();