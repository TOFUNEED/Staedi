import { standardIntervals } from './config.js';
import * as db from './firebaseService.js';
import * as ui from './ui.js';
import * as trainLogic from './trainLogic.js';
import { state, setDirty } from './state.js';

/**
 * 登録済みの列車一覧を再読み込みして描画する
 */
export async function refreshTrainList() {
    try {
        state.allTrainIds = await db.fetchAllTrainIds();
        ui.renderExistingTrainList(state.allTrainIds, ui.elements.listFilterInput.value);
    } catch (error) {
        console.error("列車一覧の更新に失敗しました:", error);
    }
}

/**
 * 指定された列車番号のデータを読み込み、編集フォームに表示する
 * @param {string} trainId - 読み込む列車番号
 */
export async function loadTrainForEditing(trainId) {
    if (state.isDirty && !confirm('編集中の内容が破棄されます。よろしいですか？')) {
        return;
    }
    if (!trainId) return;

    state.currentTrainId = trainId;
    const analysis = trainLogic.analyzeTrainId(trainId);
    
    try {
        const trainData = await db.fetchTrainData(trainId);
        const sortedStations = analysis.direction === 'up' ? [...state.allStations].reverse() : state.allStations;
        
        ui.showEditArea(trainId, analysis, trainData);
        ui.renderStationEditor(sortedStations, trainData);
        setDirty(false); // 読み込み後は未編集状態
    } catch (error) {
        console.error("データ読み込みエラー:", error);
        alert("データの読み込みに失敗しました。");
    }
}

/**
 * フォームのデータを検証し、問題なければ保存する
 */
export async function saveCurrentTrain() {
    if (!state.currentTrainId) return;

    const trainDataToSave = ui.getFormData(state);
    const validation = trainLogic.validateTrainData(trainDataToSave, state.allStations);
    
    if (!validation.isValid) {
        alert(validation.message);
        if (validation.invalidStationId) {
            ui.highlightInvalidField(validation.invalidStationId);
        }
        return;
    }

    ui.setButtonsLoading(true);
    try {
        await db.saveTrainData(state.currentTrainId, trainDataToSave);
        alert(`列車番号「${state.currentTrainId}」の情報を保存しました。`);
        setDirty(false); // 保存後は未編集状態
        await refreshTrainList();
    } catch (error) {
        console.error("保存エラー:", error);
        alert("保存に失敗しました。");
    } finally {
        ui.setButtonsLoading(false);
    }
}

/**
 * 現在編集中の列車を削除する
 */
export async function deleteCurrentTrain() {
    if (state.currentTrainId && confirm(`本当に列車番号「${state.currentTrainId}」を削除しますか？`)) {
        ui.setButtonsLoading(true);
        try {
            await db.deleteTrainData(state.currentTrainId);
            alert(`列車番号「${state.currentTrainId}」を削除しました。`);
            ui.hideEditArea();
            state.currentTrainId = null;
            setDirty(false); // 削除後は未編集状態
            await refreshTrainList();
        } catch (error) {
            console.error("削除エラー:", error);
            alert("削除に失敗しました。");
        } finally {
            ui.setButtonsLoading(false);
        }
    }
}

/**
 * 選択された運転区間テンプレートをフォームに適用する
 * @param {string} templateKey - 選択されたテンプレートのキー
 */
export function applyTemplate(templateKey) {
    const template = state.sectionTemplates[templateKey];
    if (template) {
        ui.applyOperatingSectionTemplate(template.o, template.d, state.allStations);
    }
}

/**
 * 時刻を自動計算してフォームに入力する
 */
export function autoFillTimes() {
    const direction = ui.elements.form.dataset.direction;
    const intervals = standardIntervals[direction];
    if (!intervals) return alert("方面が不明なため自動計算できません。");
    
    const rows = Array.from(ui.elements.stationEditorTbody.querySelectorAll('tr'));
    
    let firstTime = null, firstTimeIndex = -1;
    // 起点となる最初の「出発」時刻を探す
    for (let i = 0; i < rows.length; i++) {
        const timeInput = rows[i].querySelector('.stop-time-departure');
        if (timeInput?.value) {
            const [h, m] = timeInput.value.split(':').map(Number);
            if (!isNaN(h) && !isNaN(m)) {
                firstTime = h * 60 + m; // 分単位に変換
                firstTimeIndex = i;
                break;
            }
        }
    }
    if (firstTimeIndex === -1) {
        return alert("自動計算の起点となる駅の出発時刻を1つ以上「HH:MM」形式で入力してください。");
    }
    
    let currentTime = firstTime;
    // 起点以降の駅の出発時刻を計算して埋める
    for (let i = firstTimeIndex; i < rows.length - 1; i++) {
        const chk1 = rows[i].querySelector('.stop-check');
        const chk2 = rows[i+1].querySelector('.stop-check');
        // 現在の駅と次の駅が両方「停車」の場合のみ計算
        if (chk1.checked && chk2.checked) {
            const interval = intervals[chk1.dataset.stationId];
            if (interval) {
                currentTime += interval;
                const h = Math.floor(currentTime / 60) % 24;
                const m = currentTime % 60;
                const timeStr = `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`;
                
                const nextInput = rows[i+1].querySelector('.stop-time-departure');
                if(nextInput) {
                    nextInput.value = timeStr;
                }
            }
        }
    }
}