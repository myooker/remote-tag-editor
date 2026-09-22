#ifndef WEB_TAG_EDITOR_PROGRAM_H
#define WEB_TAG_EDITOR_PROGRAM_H

#include <filesystem>
#include <string_view>
#include <tstring.h>

#include "SQLiteCpp/Backup.h"

namespace rte {
    namespace fs = std::filesystem;

    constexpr std::string_view version { "1.5.0" };
    constexpr std::string_view name { "web-tag-editor" };
    constexpr std::string jsonMissingValue { "_json_none" };

    enum DIR_DEPTH {
        ARTIST = 1,
        ARTIST_AND_ALBUMS = 2,
        ALL = 100,
    };

    enum class EntityType {
        directory,
        music,
        picture,
        file,

        max_type
    };

    namespace Environments {
        constexpr std::string_view use_rteid { "RTE_USERTEID" };
    }

    struct QueryList {
        enum class SortType { name, size, type, MAXSORT };
        const std::size_t offset { 0 };
        const std::size_t limit { 100 };
        const bool ascending { true };
        const SortType sort { SortType::name };
    };

    struct FileEntity {
        std::string name {};
        std::string ext {};
        uintmax_t size {};
        //modified
        EntityType type { EntityType::directory };

        std::string typeString() const {
            switch (type) {
                case EntityType::directory: return "directory";
                case EntityType::music:     return "music";
                case EntityType::picture:   return "picture";
                case EntityType::file:      return "file";
                default:                    return "file";
            }
        }
    };

    struct Settings {
        std::string mountpoint { "/music" };
        std::string dbpath { "data/database.db" };
        std::string mappingpath { "data/mapping.json" };
        bool useRteid { false };
        int port{ 18080 };

        [[nodiscard]] bool isExist() const {
            const fs::path p { mountpoint };
            return !std::filesystem::exists(p);
        }

        [[nodiscard]] bool isMountPoint(const std::string &requestedPath) const {
            const std::string mp { fs::canonical(mountpoint) };        // canonical mount point
            const std::string rp { fs::canonical(requestedPath) };     // canonical requested path

            if (rp.starts_with(mp)) {
                return true;
            }

            return false;
        }
    };

    struct FilePath {
        fs::path path {};
        std::string extension { path.extension() };
    };

    struct TagModification {
        std::string filePath       { "none" };
        std::string fieldType      { "none" };
        TagLib::String replaceWhat { "none", TagLib::String::UTF8 };
        TagLib::String replaceWith { "none", TagLib::String::UTF8 };
        TagLib::String value       { "none", TagLib::String::UTF8 };

        /**
         * @brief This function validates whenever TagModification struct is valid.
         *
         * If one of TagModification members is not valid (equal to "_json_none"), then a struct is not valid.
         *
         * @return True if a struct doesn't have "_json_none" members, otherwise false.
         */
        [[nodiscard]] bool isValid() const {
            if (const std::string &x { jsonMissingValue };
                filePath == x || fieldType == x || replaceWhat == x || replaceWith == x || value == x)
                return false;
            return true;
        }
    };
}

#endif //WEB_TAG_EDITOR_PROGRAM_H