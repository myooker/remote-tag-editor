#ifndef WEB_TAG_EDITOR_PROGRAM_H
#define WEB_TAG_EDITOR_PROGRAM_H
#include <filesystem>

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
        //std::string mountpoint { "/home/myooker/music2" };
        std::string mountpoint { "/media/music2" };
        // std::string testFlacFile { "/home/myooker/music2/01 Shadow Wizard Money Gang, Cynthoni - Psychic Unhealing.flac" };
        // std::string testMp3File { "/home/myooker/music2/A.L.I.S.O.N - Seagulls.mp3"};
        std::string testmp4file {"/home/myooker/music2/Nakajima Megumi - TRY UNITE! (aran Remix) [266128272].m4a"};
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