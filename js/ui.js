// DOM要素の取得
export const elements = {
    searchInput: document.getElementById('search-trainId'),
    searchBtn: document.getElementById('search-btn'),
    editArea: document.getElementById('edit-area'),
    title: document.getElementById('current-trainId-title'),
    form: document.getElementById('train-form'),
    stationEditorTbody: document.getElementById('station-editor-tbody'),
    setAllStopsBtn: document.getElementById('set-all-stops-btn'),
    deleteTrainBtn: document.getElementById('delete-train-btn'),
    copyBtn: document.getElementById('copy-btn'),
    autoFillTimesBtn: document.getElementById('auto-fill-times-btn'),
};

/**
 * 編集エリアを表示し、基本情報を埋める
 * @param {string} trainId 列車番号
 * @param {Object} analysis 列車番号の解析結果
 * @param {Object} trainDetails 列車詳細
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
        elements.form.querySelector('#train-destination').value = trainDetails.destination || '';
        elements.form.querySelector('#train-days').value = trainDetails.day || 'everyday';
    }

    elements.editArea.style.display = 'block';
}

/**
 * 停車駅エディタを描画する
 * @param {Array} stations 表示する駅のリスト（方面でソート済み）
 * @param {Array} stopList その列車の停車駅情報
 */
export function renderStationEditor(stations, stopList) {
    const company = elements.form.dataset.company;
    const direction = elements.form.dataset.direction;
    elements.stationEditorTbody.innerHTML = '';

    stations.forEach(station => {
        const stopInfo = stopList.find(s => s.stationId === station.id);
        const tr = document.createElement('tr');
        
        let timeInputHtml = `<div class="time-and-details">`;
        let detailsHtml = '';

        // 駅ごとの特殊UI生成
        if (company === 'JR飯山線' && station.id === 'toyono') {
            timeInputHtml += `着: <input type="time" class="stop-time-arrival" value="${stopInfo?.time_arrival || ''}"> 発: <input type="time" class="stop-time-departure" value="${stopInfo?.time || ''}">`;
        } else {
            timeInputHtml += `<input type="time" class="stop-time" value="${stopInfo?.time || ''}">`;
        }

        if (company === 'しなの鉄道') {
            if (station.id === 'nagano') {
                detailsHtml += `<input type="text" class="station-detail-input" data-type="next_trainId" placeholder="直通後 列車番号" value="${stopInfo?.next_trainId || ''}">`;
            }
            if (station.id === 'komoro') {
                let placeholder = "番線";
                if (direction === 'up' && stopList.some((s, i) => s.stationId === 'komoro' && i < stopList.length - 1)) placeholder = "1 (推奨)";
                else if (stopList.find(s => s.stationId === 'komoro') === stopList[stopList.length-1]) placeholder = "2 (推奨)";
                else if (stopList.find(s => s.stationId === 'komoro') === stopList[0]) placeholder = "3 (推奨)";
                detailsHtml += `<input type="number" class="station-detail-input" data-type="platform" placeholder="${placeholder}" value="${stopInfo?.platform || ''}">`;
            }
        }
        
        timeInputHtml += `${detailsHtml}</div>`;
        
        tr.innerHTML = `
            <td><input type="checkbox" class="stop-check" data-station-id="${station.id}" ${stopInfo ? 'checked' : ''}></td>
            <td>${station.name_jp}</td>
            <td>${timeInputHtml}</td>
        `;
        elements.stationEditorTbody.appendChild(tr);
    });
}

/**
 * フォームから入力されたデータを取得する
 * @returns {Object} 列車詳細と停車駅リスト
 */
export function getFormData() {
    const trainData = {
        type: elements.form.querySelector('#train-type').value,
        name: elements.form.querySelector('#train-name').value,
        destination: elements.form.querySelector('#train-destination').value,
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

            const timeInput = tr.querySelector('.stop-time');
            const arrivalInput = tr.querySelector('.stop-time-arrival');
            const departureInput = tr.querySelector('.stop-time-departure');
            if (departureInput) stopData.time = departureInput.value;
            if (timeInput) stopData.time = timeInput.value;
            if (arrivalInput) stopData.time_arrival = arrivalInput.value;

            tr.querySelectorAll('.station-detail-input').forEach(detailInput => {
                if (detailInput.value) {
                    stopData[detailInput.dataset.type] = detailInput.value;
                }
            });

            if (stopData.time) {
                stopList.push(stopData);
            }
        }
    });
    return { trainData, stopList };
}

/**
 * 編集エリアを非表示にする
 */
export function hideEditArea() {
    elements.editArea.style.display = 'none';
    elements.searchInput.value = '';
}