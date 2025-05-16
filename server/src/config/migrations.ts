import { AppDataSource } from './database';
import { AddOriginalAuthorColumn1683312000000 } from "../migrations/1683312000000-AddOriginalAuthorColumn";
import { RemoveUserLikedColumn1746505549661 } from "../migrations/1746505549661-RemoveUserLikedColumn";
import { UpdateLikeTables1746505549662 } from "../migrations/1746505549662-UpdateLikeTables";
import { AddIsAdminColumn1746557908174 } from "../migrations/1746557908174-AddIsAdminColumn";
import { CreateFirstAdmin1746558605356 } from "../migrations/1746558605356-CreateFirstAdmin";
import { AddIsMainAdminColumn1746565106921 } from "../migrations/1746565106921-AddIsMainAdminColumn";
import { AddContactInfoColumns1746574982521 } from "../migrations/1746574982521-AddContactInfoColumns";
import { AddChatTables1746588461222 } from "../migrations/1746588461222-AddChatTables";
import { AddProfileImageColumn1746589000000 } from "../migrations/1746589000000-AddProfileImageColumn";
import { AddAvatarPathToChatConversation1747024813781 } from "../migrations/1747024813781-AddAvatarPathToChatConversation";
import { AddStatusToChatMessage1747157121124 } from "../migrations/1747157121124-AddStatusToChatMessage";
import { CreateBlockedIpsTable1747300000000 } from "../migrations/1747300000000-CreateBlockedIpsTable";
import { AddLastIpAddressToUser1747380000000 } from "../migrations/1747380000000-AddLastIpAddressToUser";

export const migrations = [
    AddOriginalAuthorColumn1683312000000,
    RemoveUserLikedColumn1746505549661,
    UpdateLikeTables1746505549662,
    AddIsAdminColumn1746557908174,
    CreateFirstAdmin1746558605356,
    AddIsMainAdminColumn1746565106921,
    AddContactInfoColumns1746574982521,
    AddChatTables1746588461222,
    AddProfileImageColumn1746589000000,
    AddAvatarPathToChatConversation1747024813781,
    AddStatusToChatMessage1747157121124,
    CreateBlockedIpsTable1747300000000,
    AddLastIpAddressToUser1747380000000
];

// Execute as migrações necessárias
export async function runMigrations() {
    try {
        await AppDataSource.runMigrations();
        console.log('Migrations executed successfully');
    } catch (error) {
        console.error('Error executing migrations:', error);
        throw error;
    }
}
