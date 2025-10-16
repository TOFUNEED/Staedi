import * as db from './firebaseService.js';
import * as ui from './ui.js';
import * as logic from './appLogic.js';
import * as trainLogic from './trainLogic.js';
import { state, setDirty } from './state.js';

/**
 * アプリケーションを初期化する
 */
async function initialize() {
    // 1. データベースから全駅データを取得してstateに保存
    state.allStations = await db.getAllStations();
    
    // 2. 駅データを元にUI（プルダウンメニュー）を構築
    ui.populateStationDropdowns(state.allStations);

    // 3. 登録済み列車の一覧を初回読み込み
    await logic.refreshTrainList();

    // 4. UI要素にイベントハンドラを配線する

    // --- メイン操作 ---
    ui.elements.searchBtn.addEventListener('click', () => {
        logic.loadTrainForEditing(ui.elements.searchInput.value);
    });
    
    ui.elements.existingTrainsContainer.addEventListener('click', (e) => {
        e.preventDefault();
        const trainId = e.target.closest('a[data-train-id]')?.dataset.trainId;
        if (trainId) {
            ui.elements.searchInput.value = trainId;
            logic.loadTrainForEditing(trainId);
        }
    });

    ui.elements.form.addEventListener('submit', (e) => {
        e.preventDefault();
        logic.saveCurrentTrain();
    });

    ui.elements.deleteTrainBtn.addEventListener('click', logic.deleteCurrentTrain);

    // --- フォーム内操作 ---
    ui.elements.sectionTemplateSelect.addEventListener('change', (e) => {
        logic.applyTemplate(e.target.value);
    });

    const rerenderEditor = () => {
        const analysis = trainLogic.analyzeTrainId(state.currentTrainId);
        const sortedStations = analysis.direction === 'up' ? [...state.allStations].reverse() : state.allStations;
        const trainData = ui.getFormData(state);
        ui.renderStationEditor(sortedStations, trainData);
    };
    ui.elements.trainOriginSelect.addEventListener('change', rerenderEditor);
    ui.elements.trainDestinationSelect.addEventListener('change', rerenderEditor);

    ui.elements.autoFillTimesBtn.addEventListener('click', logic.autoFillTimes);
    ui.elements.listFilterInput.addEventListener('input', logic.refreshTrainList);


    // --- ページ全体と動的コンテンツのイベント ---

    // フォームが編集されたらisDirtyフラグを立てる
    ui.elements.form.addEventListener('input', () => setDirty(true));
    
    // 未保存のままページを離れようとしたら警告する
    window.addEventListener('beforeunload', (e) => {
        if (state.isDirty) {
            e.preventDefault();
            e.returnValue = ''; // 標準の警告メッセージを表示
        }
    });

    // 終着駅の「接続種別」セレクトが変更されたときの処理
    ui.elements.stationEditorTbody.addEventListener('change', (event) => {
        if (event.target.matches('.connection-type-select')) {
            const select = event.target;
            const nextTrainInput = select.closest('td').querySelector('.next-train-input');
            if (nextTrainInput) {
                nextTrainInput.style.display = select.value === 'end' ? 'none' : 'inline-block';
            }
        }
    });
    
    // Enterキーで次の入力欄へ移動
    ui.elements.stationEditorTbody.addEventListener('keydown', (event) => {
        if (event.key !== 'Enter' || event.shiftKey) return;
        const target = event.target;
        if (target.matches('input[type="text"], input[type="number"]')) {
            event.preventDefault();
            const inputs = Array.from(ui.elements.stationEditorTbody.querySelectorAll('input[type="text"], input[type="number"]'));
            const currentIndex = inputs.indexOf(target);
            if (currentIndex !== -1 && currentIndex + 1 < inputs.length) {
                inputs[currentIndex + 1].focus();
            }
        }
    });
}

// --- アプリケーションの実行 ---
initialize();