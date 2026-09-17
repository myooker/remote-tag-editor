#include "../include/history.h"

namespace rte::storage {
    crow::response Database::insertAdd(const TagModification &tagStruct, const id &idStruct) const {
        int i {};
        SQLite::Statement query(m_database,
        "INSERT INTO tag_history (rteid, action, path, tag, new_value) "
        "VALUES (?, ?, ?, ?, ?)");
        query.bind(++i, idStruct.rte);
        query.bind(++i, add.begin());
        query.bind(++i, tagStruct.filePath);
        query.bind(++i, tagStruct.fieldType);
        query.bind(++i, tagStruct.value.to8Bit(true));
        query.exec();

        return crow::response{ 200 };
    }

    crow::response Database::insertEdit(const TagModification &tagStruct, const id &idStruct) const {
        int i {};
        SQLite::Statement query(m_database,
        "INSERT INTO tag_history (rteid, action, path, tag, old_value, new_value) "
        "VALUES (?, ?, ?, ?, ?, ?)");
        query.bind(++i, idStruct.rte);
        query.bind(++i, change.begin());
        query.bind(++i, tagStruct.filePath);
        query.bind(++i, tagStruct.fieldType);
        query.bind(++i, tagStruct.replaceWhat.to8Bit(true));
        query.bind(++i, tagStruct.replaceWith.to8Bit(true));
        query.exec();

        return crow::response{ 200 };
    }

    crow::response Database::insertRemove(const TagModification &tagStruct, const id &idStruct) const {
        int i {};
        SQLite::Statement query(m_database,
            "INSERT INTO tag_history (rteid, action, path, tag, old_value) "
        "VALUES (?, ?, ?, ?, ?)");
        query.bind(++i, idStruct.rte);
        query.bind(++i, remove.begin());
        query.bind(++i, tagStruct.filePath);
        query.bind(++i, tagStruct.fieldType);
        query.bind(++i, tagStruct.value.to8Bit(true));
        query.exec();

        return crow::response{ 200 };
    }

    crow::response Database::deleteFile(const std::string& path) const {
        SQLite::Statement deletePath(m_database,
        "DELETE FROM tag_history WHERE path = ?");
        deletePath.bind(1, path);
        deletePath.exec();

        return crow::response{ 200 };
    }
} // program