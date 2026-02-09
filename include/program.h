#ifndef WEB_TAG_EDITOR_PROGRAM_H
#define WEB_TAG_EDITOR_PROGRAM_H
#include <filesystem>
#include <crow/logging.h>

namespace program {
    namespace fs = std::filesystem;
    constexpr std::string_view version { "Alpha 1.2.0" };
    constexpr std::string_view name { "web-tag-editor" };

    enum DIR_DEPTH {
        ARTIST = 1,
        ARTIST_AND_ALBUMS = 2,
        ALL = 100,
    };

    struct settings {
        int port{ 18080 };
        std::string mountpoint { "/media/music2" };
        std::string debugFile {};
        [[nodiscard]] bool isExist() const {
            const fs::path p { mountpoint };
            return !std::filesystem::exists(p);
        }
    };

    struct filePath {
        fs::path path {};
        std::string extension { path.extension() };
    };
}

#endif //WEB_TAG_EDITOR_PROGRAM_H