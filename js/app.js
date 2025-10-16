import { standardIntervals } from './config.js';
import * as db from './firebaseService.js';
import * as ui from './ui.js';

// --- アプリケーションの状態管理 ---
let state = {
    allStations: [],
    currentTrainId: null,
};

// --- ビジネスロジック ---

/**
 * 列車番号を解析する
 * @param {string} trainId 列車番号
 * @returns {Object} 解析結果
 */
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

// --- イベントハンドラ ---

/**
 * 検索ボタンが押されたときの処理
 */
async function handleSearch() {
    const trainId = ui.elements.searchInput.value.trim().toUpperCase();
    if (!trainId) return;

    state.currentTrainId = trainId;
    const analysis = analyzeTrainId(trainId);
    
    try {
        const { trainDetails, stopList } = await db.fetchTrainData(trainId, state.allStations);
        const sortedStations = analysis.direction === 'up' ? [...state.allStations].reverse() : state.allStations;
        
        ui.showEditArea(trainId, analysis, trainDetails);
        ui.renderStationEditor(sortedStations, stopList);
    } catch (error) {
        console.error("データ読み込みエラー:", error);
        alert("データの読み込みに失敗しました。");
    }
}

/**
 * 保存ボタンが押されたときの処理
 */
async function handleSave(event) {
    event.preventDefault();
    if (!state.currentTrainId) return;

    const { trainData, stopList } = ui.getFormData();

    try {
        await db.saveTrainData(state.currentTrainId, trainData, stopList, state.allStations);
        alert(`列車番号「${state.currentTrainId}」の情報を保存しました。`);
    } catch (error) {
        console.error("保存エラー:", error);
        alert("保存に失敗しました。");
    }
}

/**
 * 削除ボタンが押されたときの処理
 */
async function handleDelete() {
    if (state.currentTrainId && confirm(`本当に列車番号「${state.currentTrainId}」を削除しますか？`)) {
        try {
            await db.deleteTrainData(state.currentTrainId, state.allStations);
            alert(`列車番号「${state.currentTrainId}」を削除しました。`);
            ui.hideEditArea();
            state.currentTrainId = null;
        } catch (error) {
            console.error("削除エラー:", error);
            alert("削除に失敗しました。");
        }
    }
}

/**
 * 複製ボタンが押されたときの処理
 */
function handleCopy() {
    const newTrainId = prompt("新しい列車番号を入力してください:", state.currentTrainId);
    if (newTrainId && newTrainId !== state.currentTrainId) {
        ui.elements.searchInput.value = newTrainId.toUpperCase();
        state.currentTrainId = newTrainId.toUpperCase();
        ui.elements.title.textContent = `列車番号: ${state.currentTrainId} (複製)`;
    }
}

/**
 * 時刻自動入力
 */
function handleAutoFillTimes() {
    // この機能のロジックはUIに密結合しているので、ui.jsに移動しても良いかもしれません
    // 今回は簡潔さのためここに残します
    const direction = ui.elements.form.dataset.direction;
    const intervals = standardIntervals[direction];
    const rows = Array.from(ui.elements.stationEditorTbody.querySelectorAll('tr'));
    
    // ... (autoFillTimesのロジックは変更なし) ...
    let firstTime = null, firstTimeIndex = -1;
    for (let i = 0; i < rows.length; i++) {
        const timeInput = rows[i].querySelector('.stop-time') || rows[i].querySelector('.stop-time-departure');
        if (timeInput?.value) {
            const [h, m] = timeInput.value.split(':').map(Number);
            firstTime = h * 60 + m;
            firstTimeIndex = i;
            break;
        }
    }
    if (firstTimeIndex === -1) return alert("起点時刻を1つ入力してください。");
    
    let currentTime = firstTime;
    for (let i = firstTimeIndex; i < rows.length - 1; i++) {
        const chk1 = rows[i].querySelector('.stop-check');
        const chk2 = rows[i+1].querySelector('.stop-check');
        if (chk1.checked && chk2.checked) {
            const interval = intervals[chk1.dataset.stationId];
            if (interval) {
                currentTime += interval;
                const h = Math.floor(currentTime / 60) % 24;
                const m = currentTime % 60;
                const timeStr = `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`;
                const nextInput = rows[i+1].querySelector('.stop-time') || rows[i+1].querySelector('.stop-time-departure');
                if(nextInput) nextInput.value = timeStr;
            }
        } else { break; }
    }
}

// --- 初期化処理 ---

/**
 * アプリケーションを初期化する
 */
async function initialize() {
    // 1. 全駅データを取得してstateに保存
    state.allStations = await db.getAllStations();

    // 2. イベントリスナーを設定
    ui.elements.searchBtn.addEventListener('click', handleSearch);
    ui.elements.form.addEventListener('submit', handleSave);
    ui.elements.deleteBtn.addEventListener('click', handleDelete);
    ui.elements.copyBtn.addEventListener('click', handleCopy);
    ui.elements.autoFillTimesBtn.addEventListener('click', handleAutoFillTimes);
    ui.elements.setAllStopsBtn.addEventListener('click', () => {
        ui.elements.stationEditorTbody.querySelectorAll('.stop-check').forEach(cb => cb.checked = true);
    });
}

// --- アプリケーションの実行 ---
initialize();