//
// Created by myooker on 25.04.2026.
//

#include "../include/program.h"

#include "SQLiteCpp/Backup.h"

namespace program::database {
    void insertEdit(const SQLite::Database &db, const TagModification &tagStruct, const std::string &sid) {
        SQLite::Statement query(db,
        "INSERT INTO tag_history (rteid, action, path, tag, old_value, new_value) VALUES (?, ?, ?, ?, ?, ?)");
        query.bind(1, sid);
        query.bind(2, change.begin());
        query.bind(3, tagStruct.filePath);
        query.bind(4, tagStruct.fieldType);
        query.bind(5, tagStruct.replaceWhat);
        query.bind(6, tagStruct.replaceWith);
        query.exec();
    }

    void insertAdd(const SQLite::Database& db, const TagModification& tagStruct, const std::string& sid) {
        SQLite::Statement query(db,
        "INSERT INTO tag_history (rteid, action, path, tag, new_value) VALUES (?, ?, ?, ?, ?)");
        query.bind(1, sid);
        query.bind(2, add.begin());
        query.bind(3, tagStruct.filePath);
        query.bind(4, tagStruct.fieldType);
        query.bind(5, tagStruct.value);
        query.exec();
    }

    void insertRemove(const SQLite::Database& db, const TagModification& tagStruct, const std::string& sid) {
        SQLite::Statement query(db,
            "INSERT INTO tag_history (rteid, action, path, tag, old_value) VALUES (?, ?, ?, ?, ?)");
        query.bind(1, sid);
        query.bind(2, remove.begin());
        query.bind(3, tagStruct.filePath);
        query.bind(4, tagStruct.fieldType);
        query.bind(5, tagStruct.value);
        query.exec();
    }

    void deleteFile(const SQLite::Database& db, const std::string &path) {
        SQLite::Statement deletePath(db,
        "DELETE FROM tag_history WHERE path = ?");
        deletePath.bind(1, path);
        deletePath.exec();
    }
}
