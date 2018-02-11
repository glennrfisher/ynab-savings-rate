// ==UserScript==
// @name         YNAB Savings Rate
// @namespace    https://github.com/glennrfisher
// @version      0.0.1
// @description  Replace age of money with a savings rate computed from chosen categories.
// @author       Glenn R. Fisher
// @match        https://app.youneedabudget.com/*
// @grant        none
// @run-at       document-start
// ==/UserScript==

'use strict';

/***********************************************************************
 *  Constants
 ***********************************************************************/

// The key used to save/load a list of categories with local storage.
// The saved categories are used to calculate the savings rate when no
// category is checked. Categories are referenced using their data-entity-id.
const LOCAL_STORAGE_KEY = 'savings-rate-ids';

/***********************************************************************
 *  Run calculations and UI updates when the DOM changes
 ***********************************************************************/

const observer = new MutationObserver(_ => {
    if (!window.location.pathname.includes('/budget')) return;
    if (!document.querySelector('.ember-view')) return;
    showSavingsRate();
    showButton();
});

observer.observe(document.documentElement, { childList: true, subtree: true });

/***********************************************************************
 *  Manage savings rate categories
 ***********************************************************************/

function getSavingsRateCategories() {
    const checked = getCheckedCategories();
    const saved = loadCheckedCategories();
    const ids = (checked.length == 0) ? saved : checked;
    return ids;
}

function getCheckedCategories() {
    const query = '.budget-table-row.is-sub-category.is-checked';
    const checked = [...document.querySelectorAll(query)];
    const ids = checked.map(row => row.dataset.entityId);
    return ids;
}

function loadCheckedCategories() {
    const ids = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY));
    return ids;
}

function saveCheckedCategories() {
    const ids = getCheckedCategories();
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(ids));
}

/***********************************************************************
 *  Scrape page to compute monthly savings rate
 ***********************************************************************/

function getMonthlySavingsRate(ids) {
    ids = ids || getSavingsRateCategories();
    return getMonthlySavings(ids) / getMonthlyBudget();
}

function getMonthlySavings(ids) {
    let savings = 0;
    const rows = ids.map(id => document.querySelector(`ul[data-entity-id="${id}"]`));
    rows.forEach(row => {
        const budget = row.querySelector('.budget-table-cell-budgeted .currency-input');
        savings += currencyToFloat(budget.title);
    });
    return savings;
}

function getMonthlyBudget() {
    const totals = document.querySelector('.budget-header-totals-details-values');
    const budgeted = totals.children[2];
    return currencyToFloat(budgeted.title);
}

function currencyToFloat(value) {
    const sanitized = value.replace('$', '').replace(',', '');
    return parseFloat(sanitized);
}

/***********************************************************************
 *  Update UI
 ***********************************************************************/

function showSavingsRate(rate) {
    rate = rate || getMonthlySavingsRate();
    const percentage = Math.round(rate * Math.pow(10, 3)) / 10;
    const age = document.querySelector('.budget-header-days-age');
    const description = document.querySelector('.budget-header-days-label');
    age.innerText = percentage + '%';
    description.innerText = 'Savings Rate';
}

function showButton() {
    if (getCheckedCategories().length == 0) return;
    if (document.querySelector('#savings-rate-button')) return;
    const optionGroups = document.querySelector('.option-groups');
    const div = document.createElement('div');
    const button = document.createElement('button');
    button.id = 'savings-rate-button';
    button.className = 'budget-inspector-button';
    button.title = 'Select the categories to use when calculating the savings rate.';
    button.innerText = 'Set Savings Categories';
    button.addEventListener('click', saveCheckedCategories);
    div.appendChild(button);
    optionGroups.appendChild(div);
}