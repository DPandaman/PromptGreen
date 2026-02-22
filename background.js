// background.js
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    // Wait until page finishes loading
    if (changeInfo.status === 'complete' && tab.url.includes('chatgpt.com')) {
        // Open dashboard.html in a new tab
        chrome.tabs.create({ url: chrome.runtime.getURL('popup.html') });
    }
});