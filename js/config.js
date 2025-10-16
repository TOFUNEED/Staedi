// Firebaseプロジェクトの接続情報
// ▼▼▼ あなたのFirebaseプロジェクトの接続情報に書き換えてください ▼▼▼
export const firebaseConfig = {
    apiKey: "AIzaSyAG5BdEwEOZF6nft-9FYzdSOw3yAfHllwM",
    authDomain: "shinanopwa.firebaseapp.com",
    projectId: "shinanopwa",
    storageBucket: "shinanopwa.appspot.com",
    messagingSenderId: "65363009149",
    appId: "1:65363009149:web:8b683f5d2b86b0300cdb14",
    measurementId: "G-GXD4W4BKC8"
};
// ▲▲▲ ここまで ▲▲▲


// 駅間の標準所要時間データ（分）
// PWAの時刻自動入力機能などで使用される可能性があります
export const standardIntervals = {
    down: {
        'karuizawa': 4, 
        'naka-karuizawa': 3, 
        'shinano-oiwake': 4, 
        'miyota': 4, 
        'hirahara': 4,
        'komoro': 3, 
        'shigeno': 3, 
        'tanaka': 3, 
        'ohya': 4, 
        'ueda': 3, 
        'nishi-ueda': 3,
        'sakaki-techno': 3, 
        'sakaki': 4, 
        'togura': 3, 
        'chikuma': 3, 
        'yashiro': 2, 
        'yashiro-koukou-mae': 4,
        'shinonoi': 3, 
        'imai': 3, 
        'kawanakajima': 3, 
        'amori': 3,
        'nagano': 3, 
        'kita-nagano': 3, 
        'sansai': 4, 
        'toyono': 6, 
        'mure': 5, 
        'furuma': 4, 
        'kurohime': 6
    },
    up: {
        'myoko-kogen': 6, 
        'kurohime': 4, 
        'furuma': 5, 
        'mure': 6, 
        'toyono': 4, 
        'sansai': 3, 
        'kita-nagano': 3,
        'nagano': 3, 
        'amori': 3, 
        'kawanakajima': 3, 
        'imai': 3,
        'shinonoi': 4, 
        'yashiro-koukou-mae': 2, 
        'yashiro': 3, 
        'chikuma': 3, 
        'togura': 4, 
        'sakaki': 3,
        'sakaki-techno': 3, 
        'nishi-ueda': 3, 
        'ueda': 4, 
        'ohya': 3, 
        'tanaka': 3, 
        'shigeno': 3,
        'komoro': 4, 
        'hirahara': 4, 
        'miyota': 4, 
        'shinano-oiwake': 3, 
        'naka-karuizawa': 4
    }
};