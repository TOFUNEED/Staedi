import * as db from './firebaseService.js';
import * as ui from './ui.js';
import * as handlers from './eventHandlers.js';

// --- アプリケーションの状態管理 ---
// このアプリで共有される唯一のデータソース
const state = {
    allStations: [],
    currentTrainId: null,
    sectionTemplates: {
        'karuizawa-komoro': { o: 'karuizawa', d: 'komoro' },
        'karuizawa-ueda': { o: 'karuizawa', d: 'ueda' },
        'karuizawa-nagano': { o: 'karuizawa', d: 'nagano' },
        'komoro-nagano': { o: 'komoro', d: 'nagano' },
        'ueda-nagano': { o: 'ueda', d: 'nagano' },
        'togura-nagano': { o: 'togura', d: 'nagano' },
        'nagano-toyono_sr': { o: 'nagano', d: 'toyono' },
        'nagano-toyono_jr': { o: 'nagano', d: 'toyono' },
        'nagano-myoko-kogen': { o: 'nagano', d: 'myoko-kogen' },
        'myoko-kogen-nagano': { o: 'myoko-kogen', d: 'nagano' },
        'toyono_sr-nagano': { o: 'toyono', d: 'nagano' },
        'toyono_jr-nagano': { o: 'toyono', d: 'nagano' },
        'nagano-togura': { o: 'nagano', d: 'togura' },
        'nagano-ueda': { o: 'nagano', d: 'ueda' },
        'nagano-komoro': { o: 'nagano', d: 'komoro' },
        'togura-komoro': { o: 'togura', d: 'komoro' },
        'togura-karuizawa': { o: 'togura', d: 'karuizawa' },
        'komoro-karuizawa': { o: 'komoro', d: 'karuizawa' },
    }
};


// --- 初期化処理 ---
// アプリケーションが起動したときに一度だけ実行される
async function initialize() {
    // 1. データベースから全駅データを取得してstateに保存
    state.allStations = await db.getAllStations();
    
    // 2. 駅データを元にUI（プルダウンメニュー）を構築
    ui.populateStationDropdowns(state.allStations);

    // 3. 登録済み列車の一覧を初回読み込み
    await handlers.refreshTrainList();

    // 4. UI要素にイベントハンドラを配線する
    ui.elements.searchBtn.addEventListener('click', () => handlers.handleSearch(state));
    ui.elements.form.addEventListener('submit', (e) => handlers.handleSave(state, e));
    ui.elements.deleteBtn.addEventListener('click', () => handlers.handleDelete(state));
    ui.elements.sectionTemplateSelect.addEventListener('change', (e) => handlers.handleTemplateChange(state, e));
    ui.elements.trainOriginSelect.addEventListener('change', () => handlers.handleOperatingSectionChange(state));
    ui.elements.trainDestinationSelect.addEventListener('change', () => handlers.handleOperatingSectionChange(state));
    ui.elements.existingTrainsContainer.addEventListener('click', (e) => handlers.handleTrainListClick(state, e));

    // 時刻入力で停車チェックを自動ON
    ui.elements.stationEditorTbody.addEventListener('input', (event) => {
        // イベントが発生したのが時刻入力欄かどうかをチェック
        const isTimeInput = event.target.matches('input[type="text"], input[type="number"]');
        if (isTimeInput && event.target.value) {
            const row = event.target.closest('tr');
            if (row) {
                const checkbox = row.querySelector('.stop-check');
                if (checkbox) checkbox.checked = true;
            }
        }
    });
    
    // Enterキーで次の入力欄へ移動
    ui.elements.stationEditorTbody.addEventListener('keydown', (event) => {
        if (event.key !== 'Enter' || event.shiftKey) return;
        const target = event.target;
        // 時刻入力欄または番線入力欄でEnterが押された場合
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