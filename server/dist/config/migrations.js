"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.migrations = void 0;
exports.runMigrations = runMigrations;
const database_1 = require("./database");
const _1683312000000_AddOriginalAuthorColumn_1 = require("../migrations/1683312000000-AddOriginalAuthorColumn");
const _1746505549661_RemoveUserLikedColumn_1 = require("../migrations/1746505549661-RemoveUserLikedColumn");
const _1746505549662_UpdateLikeTables_1 = require("../migrations/1746505549662-UpdateLikeTables");
const _1746557908174_AddIsAdminColumn_1 = require("../migrations/1746557908174-AddIsAdminColumn");
const _1746558605356_CreateFirstAdmin_1 = require("../migrations/1746558605356-CreateFirstAdmin");
const _1746565106921_AddIsMainAdminColumn_1 = require("../migrations/1746565106921-AddIsMainAdminColumn");
const _1746574982521_AddContactInfoColumns_1 = require("../migrations/1746574982521-AddContactInfoColumns");
const _1746588461222_AddChatTables_1 = require("../migrations/1746588461222-AddChatTables");
const _1746589000000_AddProfileImageColumn_1 = require("../migrations/1746589000000-AddProfileImageColumn");
const _1747024813781_AddAvatarPathToChatConversation_1 = require("../migrations/1747024813781-AddAvatarPathToChatConversation");
const _1747157121124_AddStatusToChatMessage_1 = require("../migrations/1747157121124-AddStatusToChatMessage");
const _1747300000000_CreateBlockedIpsTable_1 = require("../migrations/1747300000000-CreateBlockedIpsTable");
const _1747380000000_AddLastIpAddressToUser_1 = require("../migrations/1747380000000-AddLastIpAddressToUser");
exports.migrations = [
    _1683312000000_AddOriginalAuthorColumn_1.AddOriginalAuthorColumn1683312000000,
    _1746505549661_RemoveUserLikedColumn_1.RemoveUserLikedColumn1746505549661,
    _1746505549662_UpdateLikeTables_1.UpdateLikeTables1746505549662,
    _1746557908174_AddIsAdminColumn_1.AddIsAdminColumn1746557908174,
    _1746558605356_CreateFirstAdmin_1.CreateFirstAdmin1746558605356,
    _1746565106921_AddIsMainAdminColumn_1.AddIsMainAdminColumn1746565106921,
    _1746574982521_AddContactInfoColumns_1.AddContactInfoColumns1746574982521,
    _1746588461222_AddChatTables_1.AddChatTables1746588461222,
    _1746589000000_AddProfileImageColumn_1.AddProfileImageColumn1746589000000,
    _1747024813781_AddAvatarPathToChatConversation_1.AddAvatarPathToChatConversation1747024813781,
    _1747157121124_AddStatusToChatMessage_1.AddStatusToChatMessage1747157121124,
    _1747300000000_CreateBlockedIpsTable_1.CreateBlockedIpsTable1747300000000,
    _1747380000000_AddLastIpAddressToUser_1.AddLastIpAddressToUser1747380000000
];
// Execute as migrações necessárias
function runMigrations() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            yield database_1.AppDataSource.runMigrations();
            console.log('Migrations executed successfully');
        }
        catch (error) {
            console.error('Error executing migrations:', error);
            throw error;
        }
    });
}
