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
    trainOriginSelect: document.getElementById('train-origin'),
    trainDestinationSelect: document.getElementById('train-destination'),
    sectionTemplateSelect: document.getElementById('section-template'),
    existingTrainsContainer: document.getElementById('existing-trains-container'),
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
 * @param {Object} trainDetails - 列車の基本情報
 */
export function showEditArea(trainId, analysis, trainDetails) {
    elements.title.textContent = `列車番号: ${trainId}`;
    elements.form.reset();
    elements.form.dataset.direction = analysis.direction;
    elements.form.dataset.company = analysis.company;

    elements.form.querySelector('#train-direction').value = analysis.directionText;
    elements.form.querySelector('#train-company').value = analysis.company || '不明';
    
    if (trainDetails) {
        elements.form.querySelector('#train-type').value = trainDetails.type || '普通';
        elements.form.querySelector('#train-name').value = trainDetails.name || '';
        elements.trainOriginSelect.value = trainDetails.origin_station_id || '';
        elements.trainDestinationSelect.value = trainDetails.destination_station_id || '';
        elements.form.querySelector('#train-days').value = trainDetails.day || 'everyday';
    }

    elements.editArea.style.display = 'block';
}

/**
 * 登録済みの列車一覧をHTMLとして描画する
 * @param {Array} trains - {id, direction} のオブジェクトの配列
 */
export function renderExistingTrainList(trains) {
    const upTrains = trains.filter(t => t.direction === 'up');
    const downTrains = trains.filter(t => t.direction === 'down');

    let html = '';
    
    if (downTrains.length > 0) {
        html += '<h3>下り (長野・妙高高原方面)</h3>';
        html += '<ul class="existing-trains-list">';
        downTrains.forEach(train => {
            html += `<li><a href="#" data-train-id="${train.id}">${train.id}</a></li>`;
        });
        html += '</ul>';
    }
    
    if (upTrains.length > 0) {
        html += '<h3 style="margin-top: 15px;">上り (軽井沢方面)</h3>';
        html += '<ul class="existing-trains-list">';
        upTrains.forEach(train => {
            html += `<li><a href="#" data-train-id="${train.id}">${train.id}</a></li>`;
        });
        html += '</ul>';
    }

    elements.existingTrainsContainer.innerHTML = html;
}

/**
 * 停車駅エディタのテーブルを描画する
 * @param {Array} stations - 表示する駅のリスト（方面でソート済み）
 * @param {Array} stopList - その列車の停車駅情報
 */
export function renderStationEditor(stations, stopList) {
    const direction = elements.form.dataset.direction;
    const originStationId = elements.trainOriginSelect.value;
    const destinationStationId = elements.trainDestinationSelect.value;
    elements.stationEditorTbody.innerHTML = '';

    stations.forEach(station => {
        const stopInfo = stopList.find(s => s.stationId === station.id);
        const tr = document.createElement('tr');

        const isOrigin = station.id === originStationId;
        const isDestination = station.id === destinationStationId;
        const role = isOrigin ? 'origin' : (isDestination ? 'destination' : 'via');

        let timeHtml = '', detailsHtml = '';

        // 1. 時刻入力欄を生成
        if (role === 'origin') {
            timeHtml = `<input type="text" class="stop-time-departure" value="${stopInfo?.time || ''}" placeholder="HH:MM 発" pattern="[0-9]{2}:[0-9]{2}">`;
        } else if (role === 'destination') {
            timeHtml = `<input type="text" class="stop-time-arrival" value="${stopInfo?.time_arrival || stopInfo?.time || ''}" placeholder="HH:MM 着" pattern="[0-g]{2}:[0-9]{2}">`;
        } else { // 途中駅
             timeHtml = `
                <input type="text" class="stop-time-arrival" value="${stopInfo?.time_arrival || ''}" title="到着時刻" placeholder="HH:MM 着" pattern="[0-9]{2}:[0-9]{2}">
                <input type="text" class="stop-time-departure" value="${stopInfo?.time || ''}" title="出発時刻" placeholder="HH:MM 発" pattern="[0-9]{2}:[0-9]{2}">
            `;
        }
        
        // 2. 詳細入力欄（番線、乗り換えなど）を生成
        const platformArrival = stopInfo?.platform_arrival || '';
        const platformDeparture = stopInfo?.platform_departure || '';
        const nextTrainId = stopInfo?.next_trainId || '';
        const rules = trainLogic.getStationDisplayRules(station, role, direction);

        if (role === 'origin') {
            detailsHtml += `<input type="number" class="station-detail-input" data-type="platform_departure" placeholder="${rules.ph_dep}" value="${platformDeparture}">`;
        } else if (role === 'destination') {
            detailsHtml += `<input type="number" class="station-detail-input" data-type="platform_arrival" placeholder="${rules.ph_arr}" value="${platformArrival}">`;
        } else {
            detailsHtml += `着<input type="number" class="station-detail-input" data-type="platform_arrival" placeholder="${rules.ph_arr}" value="${platformArrival}"> 発<input type="number" class="station-detail-input" data-type="platform_departure" placeholder="${rules.ph_dep}" value="${platformDeparture}">`;
        }
        
        if (isDestination || station.id === 'togura' || station.id === 'ueda') {
            detailsHtml += `<input type="text" class="station-detail-input next-train" data-type="next_trainId" placeholder="接続列車番号" value="${nextTrainId}">`;
        }
        
        tr.innerHTML = `
            <td><input type="checkbox" class="stop-check" data-station-id="${station.id}" ${stopInfo ? 'checked' : ''}></td>
            <td>${station.name_jp}</td>
            <td><div class="time-and-details">${timeHtml} ${detailsHtml}</div></td>
        `;
        elements.stationEditorTbody.appendChild(tr);
    });
}

/**
 * フォームに入力されている現在の値を取得する
 * @returns {Object} { trainData, stopList } を含むオブジェクト
 */
export function getFormData() {
    const trainData = {
        type: elements.form.querySelector('#train-type').value,
        name: elements.form.querySelector('#train-name').value,
        origin_station_id: elements.trainOriginSelect.value,
        destination_station_id: elements.trainDestinationSelect.value,
        day: elements.form.querySelector('#train-days').value,
        direction: elements.form.dataset.direction,
        company: elements.form.dataset.company
    };

    const stopList = [];
    elements.stationEditorTbody.querySelectorAll('tr').forEach(tr => {
        const checkbox = tr.querySelector('.stop-check');
        if (checkbox.checked) {
            const stationId = checkbox.dataset.stationId;
            const stopData = { stationId };

            const arrivalInput = tr.querySelector('.stop-time-arrival');
            const departureInput = tr.querySelector('.stop-time-departure');
            if (departureInput) stopData.time = departureInput.value;
            if (arrivalInput) stopData.time_arrival = arrivalInput.value;
            
            tr.querySelectorAll('.station-detail-input').forEach(detailInput => {
                if (detailInput.value) {
                    stopData[detailInput.dataset.type] = detailInput.value;
                }
            });

            if (stopData.time || stopData.time_arrival) {
                stopList.push(stopData);
            }
        }
    });
    return { trainData, stopList };
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
    elements.sectionTemplateSelect.value = ""; // テンプレート選択をリセット

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