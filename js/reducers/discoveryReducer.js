/* Copyright (c) 2016 Nordic Semiconductor. All Rights Reserved.
 *
 * The information contained herein is property of Nordic Semiconductor ASA.
 * Terms and conditions of usage are described in detail in NORDIC
 * SEMICONDUCTOR STANDARD SOFTWARE LICENSE AGREEMENT.
 *
 * Licensees are granted free, non-transferable use of the information. NO
 * WARRANTY of ANY KIND is provided. This heading must NOT be removed from
 * the file.
 *
 */

'use strict';

import Immutable, { Record, OrderedMap, List } from 'immutable';
import * as DiscoveryAction from '../actions/discoveryActions';
import * as AdapterAction from '../actions/adapterActions';
import * as apiHelper from '../utils/api';
import { logger } from '../logging';

const InitialState = Record({
    devices: OrderedMap(),
    errors: List(),
});

const initialState = new InitialState();

function scanStarted(state) {
    logger.info('Scan started');
    return state;
}

function scanStopped(state) {
    logger.info('Scan stopped');
    return state;
}

function deviceDiscovered(state, device) {
    let newDevice = apiHelper.getImmutableDevice(device);
    const existingDevice = state.devices.get(device.address);

    // Keep exising name if new name is empty
    if (existingDevice && existingDevice.name !== '' && device.name === '') {
        newDevice = newDevice.setIn(['name'], existingDevice.name);
    }

    // Keep existing list of services if new list is empty
    if (existingDevice && existingDevice.services.size > 0 && device.services.length === 0) {
        newDevice = newDevice.setIn(['services'], existingDevice.services);
    }

    if (existingDevice) {
        newDevice = newDevice.setIn(['isExpanded'], existingDevice.isExpanded);
        newDevice = newDevice.mergeIn(['adData'], existingDevice.adData);
    }

    return state.setIn(['devices', device.address], newDevice);
}

function addError(state, error) {
    return state.set('errors', state.errors.push(error));
}

function clearList(state) {
    return state.set('devices', state.devices.clear());
}

function deviceConnect(state, device) {
    return state.setIn(['devices', device.address, 'isConnecting'], true);
}

function deviceConnected(state, device) {
    return state.deleteIn(['devices', device.address]);
}

function deviceConnectTimeout(state, deviceAddress) {
    logger.info(`Connection to device timed out`);
    return state.setIn(['devices', deviceAddress.address, 'isConnecting'], false);
}

function deviceCancelConnect(state) {
    const newDevices = state.devices.map(device => device.set('isConnecting', false));
    return state.set('devices', newDevices);
}

function toggleExpanded(state, deviceAddress) {
    return state.updateIn(['devices', deviceAddress, 'isExpanded'], value => !value);
}

export default function discovery(state = initialState, action) {
    switch (action.type) {
        case DiscoveryAction.DISCOVERY_CLEAR_LIST:
            return clearList(state);
        case DiscoveryAction.ERROR_OCCURED:
            return addError(state, action.error);
        case DiscoveryAction.DISCOVERY_SCAN_STARTED:
            return scanStarted(state);
        case DiscoveryAction.DISCOVERY_SCAN_STOPPED:
            return scanStopped(state);
        case DiscoveryAction.DISCOVERY_TOGGLE_EXPANDED:
            return toggleExpanded(state, action.deviceAddress);
        case AdapterAction.DEVICE_DISCOVERED:
            return deviceDiscovered(state, action.device);
        case AdapterAction.DEVICE_CONNECT:
            return deviceConnect(state, action.device);
        case AdapterAction.DEVICE_CONNECTED:
            return deviceConnected(state, action.device);
        case AdapterAction.DEVICE_CONNECT_TIMEOUT:
            return deviceConnectTimeout(state, action.deviceAddress);
        case AdapterAction.DEVICE_CANCEL_CONNECT:
            return deviceCancelConnect(state);
        case AdapterAction.ADAPTER_RESET_PERFORMED:
            return initialState;
        case AdapterAction.ADAPTER_CLOSED:
            return initialState;
        default:
            return state;
    }
}
