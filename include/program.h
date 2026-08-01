#ifndef WEB_TAG_EDITOR_PROGRAM_H
#define WEB_TAG_EDITOR_PROGRAM_H
#include <filesystem>
#include <string_view>
#include <tstring.h>

#include "SQLiteCpp/Backup.h"

namespace program {
    namespace fs = std::filesystem;

    constexpr std::string_view version { "1.5.0" };
    constexpr std::string_view name { "web-tag-editor" };
    constexpr std::string jsonMissingValue { "_json_none" };

    enum DIR_DEPTH {
        ARTIST = 1,
        ARTIST_AND_ALBUMS = 2,
        ALL = 100,
    };

    struct Settings {
        std::string mountpoint { "/music" };
        std::string dbpath { "database.db" };
        std::string testFile {};
        std::string testDirectory {};
        bool disableCrowServer { false };
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

    namespace error {
        enum MESSAGE {
            MOUNT_POINT_NOT_EXISTS,
            FILE_NOT_VALID,


            // Flac specified errors
            NOT_FOUND_XIPH,
            NOT_FOUND_FIELD_TYPE,

            // Mp3 specified errors
            NOT_FOUND_ID3V2,


            // Mp4 specified errors
            NOT_FOUND_MP4TAG,
            UNDEF_ATOM_TYPE,

        };

        consteval std::string_view printMessage(const MESSAGE msg) {
            switch (msg) {
                case MOUNT_POINT_NOT_EXISTS:
                    return "Specified mount-point does not exist. Verify the path and try again.";
                case FILE_NOT_VALID:
                    return "Specified file is not valid (cannot open/read).";
                case NOT_FOUND_XIPH:
                    return "Specified file does not have Xiph Comments.";
                default: return "ERROR_MESSAGE";
            }
        }
    }
}

#endif //WEB_TAG_EDITOR_PROGRAM_H