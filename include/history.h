//
// Created by myooker on 28.04.2026.
//

#ifndef WEB_TAG_EDITOR_SQLITE_H
#define WEB_TAG_EDITOR_SQLITE_H

#include <crow/logging.h>

#include "program.h"
#include "SQLiteCpp/SQLiteCpp.h"
#include "crow/http_response.h"

namespace program::database{
    constexpr std::string_view add { "add" };
    constexpr std::string_view change { "change" };
    constexpr std::string_view remove { "remove" };
    constexpr std::string_view rollback { "rollback" };

    struct id {
        std::string rte { "NULL" };
        std::string action { "NULL" };
    };

    class History {
    private:
        SQLite::Database m_database;
    public:
        History(const std::string &path)
            : m_database(path, SQLite::OPEN_READWRITE | SQLite::OPEN_CREATE)
        {
            CROW_LOG_WARNING << "Opening database: " << path;
            m_database.exec(R"(
                CREATE TABLE IF NOT EXISTS tag_history (
                    id           INTEGER PRIMARY KEY AUTOINCREMENT,
                    path         TEXT    NOT NULL,
                    rteid        TEXT,
                    action       TEXT    NOT NULL,
                    tag          TEXT    NOT NULL,
                    old_value    TEXT,
                    new_value    TEXT,
                    changed_at   TEXT NOT NULL DEFAULT (datetime('now'))
                )
            )");
        }

        SQLite::Database &getDatabase() { return m_database; };

        crow::response insertAdd(const TagModification &tagStruct, const id &idStruct) const;
        crow::response insertRemove(const TagModification &tagStruct, const id &idStruct) const;
        crow::response insertEdit(const TagModification &tagStruct, const id &idStruct) const;

        crow::response deleteFile(const std::string &path) const;
        crow::response moveFile(const std::string &oldPath, const std::string &newPath) const;

        crow::response rollback();
    };
}

#endif //WEB_TAG_EDITOR_SQLITE_H
