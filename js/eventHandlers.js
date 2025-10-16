import * as db from './firebaseService.js';
import * as ui from './ui.js';
import * as trainLogic from './trainLogic.js';

/**
 * 登録済みの列車一覧を再読み込みして描画する
 */
export async function refreshTrainList() {
    try {
        const trainIds = await db.fetchAllTrainIds();
        ui.renderExistingTrainList(trainIds);
    } catch (error) {
        console.error("列車一覧の更新に失敗しました:", error);
    }
}

/**
 * 列車一覧のリンクがクリックされたときの処理
 */
export function handleTrainListClick(state, event) {
    event.preventDefault(); // リンクのデフォルトの挙動（ページ遷移など）をキャンセル
    const target = event.target;
    // クリックされたのが、データ属性を持つaタグの場合のみ処理
    if (target.matches('a[data-train-id]')) {
        const trainId = target.dataset.trainId;
        ui.elements.searchInput.value = trainId;
        // 検索ボタンのクリックをプログラムで実行
        ui.elements.searchBtn.click();
    }
}

/**
 * 検索ボタンが押されたときの処理
 */
export async function handleSearch(state) {
    const trainId = ui.elements.searchInput.value.trim().toUpperCase();
    if (!trainId) return;

    state.currentTrainId = trainId;
    const analysis = trainLogic.analyzeTrainId(trainId);
    
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
export async function handleSave(state, event) {
    event.preventDefault();
    if (!state.currentTrainId) return;

    const { trainData, stopList } = ui.getFormData();

    try {
        await db.saveTrainData(state.currentTrainId, trainData, stopList, state.allStations);
        alert(`列車番号「${state.currentTrainId}」の情報を保存しました。`);
        await refreshTrainList(); // 列車一覧を更新
    } catch (error) {
        console.error("保存エラー:", error);
        alert("保存に失敗しました。");
    }
}

/**
 * 削除ボタンが押されたときの処理
 */
export async function handleDelete(state) {
    if (state.currentTrainId && confirm(`本当に列車番号「${state.currentTrainId}」を削除しますか？`)) {
        try {
            await db.deleteTrainData(state.currentTrainId, state.allStations);
            alert(`列車番号「${state.currentTrainId}」を削除しました。`);
            ui.hideEditArea();
            state.currentTrainId = null;
            await refreshTrainList(); // 列車一覧を更新
        } catch (error) {
            console.error("削除エラー:", error);
            alert("削除に失敗しました。");
        }
    }
}

/**
 * 運転区間テンプレートが選択されたときの処理
 */
export function handleTemplateChange(state, event) {
    const selectedValue = event.target.value;
    const template = state.sectionTemplates[selectedValue];
    if (template) {
        ui.applyOperatingSectionTemplate(template.o, template.d, state.allStations);
    }
}

/**
 * 出発駅または到着駅が変更されたときにエディタを再描画する
 */
export function handleOperatingSectionChange(state) {
    const analysis = trainLogic.analyzeTrainId(state.currentTrainId);
    const sortedStations = analysis.direction === 'up' ? [...state.allStations].reverse() : state.allStations;
    // フォームの現在の入力状態を一時的に取得して、再描画関数に渡す
    const { stopList } = ui.getFormData();
    ui.renderStationEditor(sortedStations, stopList);
}