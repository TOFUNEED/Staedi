import * as trainLogic from './trainLogic.js';

// HTML上の操作したい要素をあらかじめ取得しておく
export const elements = {
    searchInput: document.getElementById('search-trainId'),
    searchBtn: document.getElementById('search-btn'),
    editArea: document.getElementById('edit-area'),
    title: document.getElementById('current-trainId-title'),
    form: document.getElementById('train-form'),
    stationEditorTbody: document.getElementById('station-editor-tbody'),
    deleteTrainBtn: document.getElementById('delete-train-btn'),
    saveBtn: document.getElementById('save-btn'),
    trainOriginSelect: document.getElementById('train-origin'),
    trainDestinationSelect: document.getElementById('train-destination'),
    sectionTemplateSelect: document.getElementById('section-template'),
    existingTrainsContainer: document.getElementById('existing-trains-container'),
    listFilterInput: document.getElementById('list-filter-input'),
    autoFillTimesBtn: document.getElementById('auto-fill-times-btn'),
};

/**
 * 出発駅と到着駅のプルダウンメニューに、全駅の選択肢を生成する
 * @param {Array} stations - 全駅データのリスト
 */
export function populateStationDropdowns(stations) {
    const fragment = document.createDocumentFragment();
    stations.forEach(station => {
        const option = document.createElement('option');
        option.value = station.id;
        option.textContent = station.name_jp;
        fragment.appendChild(option);
    });
    elements.trainOriginSelect.appendChild(fragment.cloneNode(true));
    elements.trainDestinationSelect.appendChild(fragment.cloneNode(true));
}

/**
 * 編集エリアを表示し、取得した列車データをフォームに埋める
 * @param {string} trainId - 列車番号
 * @param {Object} analysis - 列車番号の解析結果
 * @param {Object} trainData - 列車の完全なデータオブジェクト
 */
export function showEditArea(trainId, analysis, trainData) {
    elements.title.textContent = `列車番号: ${trainId}`;
    elements.form.reset();
    elements.form.dataset.direction = analysis.direction;
    elements.form.dataset.company = analysis.company;

    elements.form.querySelector('#train-direction').value = analysis.directionText;
    elements.form.querySelector('#train-company').value = analysis.company || '不明';
    
    if (trainData) {
        const dayMap = { "毎日": "everyday", "平日": "weekday", "休日": "holiday" };
        const stops = trainData.stops || [];
        const firstStop = stops[0];
        const lastStop = stops[stops.length - 1];

        elements.form.querySelector('#train-type').value = trainData.train_type || '普通';
        elements.form.querySelector('#train-name').value = trainData.train_name || '';
        elements.trainOriginSelect.value = firstStop ? firstStop.station_id : '';
        elements.trainDestinationSelect.value = lastStop ? lastStop.station_id : '';
        elements.form.querySelector('#train-days').value = dayMap[trainData.operation_info] || 'everyday';
    }

    elements.editArea.style.display = 'block';
}

/**
 * 登録済みの列車一覧をHTMLとして描画する（絞り込み機能付き）
 * @param {Array} trains - {id, direction} のオブジェクトの配列
 * @param {string} filterText - 絞り込み用のテキスト
 */
export function renderExistingTrainList(trains, filterText = '') {
    const filter = filterText.toUpperCase();
    const filteredTrains = trains.filter(t => t.id.toUpperCase().includes(filter));

    const upTrains = filteredTrains.filter(t => t.direction === 'up');
    const downTrains = filteredTrains.filter(t => t.direction === 'down');

    // 検索ボックスを維持しつつ、リスト部分だけを更新する
    const listContainer = elements.existingTrainsContainer.querySelector('.list-container') || document.createElement('div');
    listContainer.className = 'list-container';
    
    let listHtml = '';
    if (downTrains.length > 0) {
        listHtml += '<h3>下り (長野・妙高高原方面)</h3>';
        listHtml += '<ul class="existing-trains-list">';
        downTrains.forEach(train => {
            listHtml += `<li><a href="#" data-train-id="${train.id}">${train.id}</a></li>`;
        });
        listHtml += '</ul>';
    }
    if (upTrains.length > 0) {
        listHtml += '<h3 style="margin-top: 15px;">上り (軽井沢方面)</h3>';
        listHtml += '<ul class="existing-trains-list">';
        upTrains.forEach(train => {
            listHtml += `<li><a href="#" data-train-id="${train.id}">${train.id}</a></li>`;
        });
        listHtml += '</ul>';
    }
    
    listContainer.innerHTML = listHtml;
    // 既存のリストがなければ追加、あれば中身を入れ替え
    if (!elements.existingTrainsContainer.querySelector('.list-container')) {
        elements.existingTrainsContainer.appendChild(listContainer);
    }
}


/**
 * 停車駅エディタのテーブルを描画する
 * @param {Array} stations - 表示する駅のリスト（方面でソート済み）
 * @param {Object} trainData - その列車のデータオブジェクト
 */
export function renderStationEditor(stations, trainData) {
    const stopList = trainData ? trainData.stops : [];
    const direction = elements.form.dataset.direction;
    const originStationId = elements.trainOriginSelect.value;
    const destinationStationId = elements.trainDestinationSelect.value;
    elements.stationEditorTbody.innerHTML = '';

    stations.forEach(station => {
        const stopInfo = stopList.find(s => s.station_id === station.id);
        const tr = document.createElement('tr');

        const isOrigin = station.id === originStationId;
        const isDestination = station.id === destinationStationId;
        const role = isOrigin ? 'origin' : (isDestination ? 'destination' : 'via');

        let timeAndDetailsHtml = '';

        if (role === 'destination') {
            // --- 終着駅のUI ---
            const arrivalTime = stopInfo?.arrival || '';
            let connectionType = 'end';
            let nextTrainNumber = '';
            
            const directInfo = trainData?.direct_info;
            const transferInfo = trainData?.transfer_info;
            const switchInfo = trainData?.switch_info;

            if (directInfo && directInfo.end_station_id === station.id) {
                connectionType = 'direct';
                nextTrainNumber = directInfo.direct_train_number || '';
            } else if (transferInfo && transferInfo.end_station_id === station.id) {
                connectionType = 'transfer';
                nextTrainNumber = transferInfo.transfer_train_number || '';
            } else if (switchInfo && switchInfo.end_station_id === station.id) {
                connectionType = 'switch';
                nextTrainNumber = switchInfo.switch_train_number || '';
            }
            
            timeAndDetailsHtml = `
                <input type="text" class="stop-time-arrival" value="${arrivalTime}" placeholder="HH:MM 着">
                <select class="connection-type-select" data-station-id="${station.id}">
                    <option value="end" ${connectionType === 'end' ? 'selected' : ''}>終着</option>
                    <option value="transfer" ${connectionType === 'transfer' ? 'selected' : ''}>乗換</option>
                    <option value="direct" ${connectionType === 'direct' ? 'selected' : ''}>直通</option>
                    <option value="switch" ${connectionType === 'switch' ? 'selected' : ''}>切替</option>
                </select>
                <input type="text" class="next-train-input" value="${nextTrainNumber}" placeholder="次の列車番号" style="${connectionType === 'end' ? 'display: none;' : ''}">
            `;
        } else {
            // --- 始発駅・途中駅のUI ---
            const departureTime = stopInfo?.departure || '';
            const platformDeparture = stopInfo?.track?.departure || '';
            const rules = trainLogic.getStationDisplayRules(station, role, direction);

            timeAndDetailsHtml = `
                <input type="text" class="stop-time-departure" value="${departureTime}" placeholder="HH:MM 発">
                <input type="number" class="station-detail-input" data-type="platform_departure" placeholder="${rules.ph_dep}" value="${platformDeparture}">
            `;
        }
        
        tr.innerHTML = `
            <td><input type="checkbox" class="stop-check" data-station-id="${station.id}" ${stopInfo ? 'checked' : ''}></td>
            <td>${station.name_jp}</td>
            <td><div class="time-and-details">${timeAndDetailsHtml}</div></td>
        `;
        elements.stationEditorTbody.appendChild(tr);
    });
}


/**
 * フォームに入力されている現在の値から、新しいJSONオブジェクトを構築する
 * @param {Object} state - アプリケーションのグローバルな状態
 * @returns {Object} 完全な列車データオブジェクト
 */
export function getFormData(state) {
    const trainId = state.currentTrainId;
    const analysis = trainLogic.analyzeTrainId(trainId);
    
    const dayMap = { "everyday": "毎日", "weekday": "平日", "holiday": "休日" };
    const operationInfo = dayMap[elements.form.querySelector('#train-days').value];

    const stops = [];
    let transferInfo = null, directInfo = null, switchInfo = null;

    elements.stationEditorTbody.querySelectorAll('tr').forEach(tr => {
        const checkbox = tr.querySelector('.stop-check');
        if (checkbox.checked) {
            const stationId = checkbox.dataset.stationId;
            const station = state.allStations.find(s => s.id === stationId);
            const isDestination = stationId === elements.trainDestinationSelect.value;
            
            const stopData = {
                station_id: stationId,
                station_name_jp: station.name_jp,
                arrival: null,
                departure: null,
                track: { arrival: null, departure: null }
            };

            if (isDestination) {
                stopData.arrival = tr.querySelector('.stop-time-arrival')?.value || null;
                const connectionType = tr.querySelector('.connection-type-select')?.value;
                const nextTrainNumber = tr.querySelector('.next-train-input')?.value;

                if (nextTrainNumber) {
                    if (connectionType === 'transfer') transferInfo = { end_station_id: stationId, transfer_train_number: nextTrainNumber };
                    if (connectionType === 'direct') directInfo = { end_station_id: stationId, direct_train_number: nextTrainNumber };
                    if (connectionType === 'switch') switchInfo = { end_station_id: stationId, switch_train_number: nextTrainNumber };
                }

            } else {
                stopData.departure = tr.querySelector('.stop-time-departure')?.value || null;
                const platformInput = tr.querySelector('[data-type="platform_departure"]');
                if (platformInput?.value) {
                    stopData.track.departure = parseInt(platformInput.value, 10);
                }
            }
            stops.push(stopData);
        }
    });

    return {
        train_number: trainId,
        train_type: elements.form.querySelector('#train-type').value,
        train_name: elements.form.querySelector('#train-name').value || null,
        operation_info: operationInfo,
        direction: analysis.direction,
        iiyama_destination: null,
        direct_info: directInfo,
        transfer_info: transferInfo,
        switch_info: switchInfo,
        stops: stops
    };
}

/**
 * 編集エリアを非表示にし、検索ボックスを空にする
 */
export function hideEditArea() {
    elements.editArea.style.display = 'none';
    elements.searchInput.value = '';
}

/**
 * 運転区間テンプレートをフォームに適用する
 * @param {string} originId - 出発駅のID
 * @param {string} destinationId - 到着駅のID
 * @param {Array} allStations - 全駅データのリスト
 */
export function applyOperatingSectionTemplate(originId, destinationId, allStations) {
    elements.trainOriginSelect.value = originId;
    elements.trainDestinationSelect.value = destinationId;
    elements.sectionTemplateSelect.value = "";

    const originStation = allStations.find(s => s.id === originId);
    const destStation = allStations.find(s => s.id === destinationId);
    if (!originStation || !destStation) return;
    
    const startOrder = Math.min(originStation.order, destStation.order);
    const endOrder = Math.max(originStation.order, destStation.order);

    elements.stationEditorTbody.querySelectorAll('.stop-check').forEach(checkbox => {
        const stationId = checkbox.dataset.stationId;
        const station = allStations.find(s => s.id === stationId);
        if (station && station.order >= startOrder && station.order <= endOrder) {
            checkbox.checked = true;
        } else {
            checkbox.checked = false;
        }
    });
}

/**
 * 指定された駅IDを持つ行を一時的にハイライトする
 * @param {string} stationId - ハイライトする駅のID
 */
export function highlightInvalidField(stationId) {
    elements.stationEditorTbody.querySelectorAll('.invalid-row').forEach(row => {
        row.classList.remove('invalid-row');
    });

    const targetRow = elements.stationEditorTbody.querySelector(`.stop-check[data-station-id="${stationId}"]`)?.closest('tr');
    
    if (targetRow) {
        targetRow.classList.add('invalid-row');
        setTimeout(() => {
            targetRow.classList.remove('invalid-row');
        }, 3000);
    }
}

/**
 * 保存・削除ボタンのローディング状態を設定する
 * @param {boolean} isLoading - ローディング状態にするか
 */
export function setButtonsLoading(isLoading) {
    if (isLoading) {
        elements.saveBtn.disabled = true;
        elements.saveBtn.textContent = '処理中...';
        elements.deleteTrainBtn.disabled = true;
    } else {
        elements.saveBtn.disabled = false;
        elements.saveBtn.textContent = '保存';
        elements.deleteTrainBtn.disabled = false;
    }
}