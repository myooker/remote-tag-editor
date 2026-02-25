#ifndef WEB_TAG_EDITOR_PROGRAM_H
#define WEB_TAG_EDITOR_PROGRAM_H
#include <filesystem>
#include <crow/logging.h>
#include <boost/bimap/bimap.hpp>
#include <boost/bimap/unordered_set_of.hpp>
#include <boost/bimap/unordered_multiset_of.hpp>

namespace program {
    namespace fs = std::filesystem;
    using namespace boost::bimaps;

    constexpr std::string_view version { "Beta 1.1.1" };
    constexpr std::string_view name { "web-tag-editor" };

    enum DIR_DEPTH {
        ARTIST = 1,
        ARTIST_AND_ALBUMS = 2,
        ALL = 100,
    };

    struct settings {
        bool disableCrowServer { false };
        int port{ 18080 };
        std::string mountpoint { "/music" };
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

    namespace music {
        namespace typeField {
            constexpr std::string title { "Title" };
            constexpr std::string artist { "Artist" };
            constexpr std::string album { "Album" };
            constexpr std::string albumArtist { "Album Artist" };
            constexpr std::string trackNumber { "Track Number" };
            constexpr std::string totalTracks { "Total Tracks" };
            constexpr std::string discNumber { "Disc Number" };
            constexpr std::string totalDiscs { "Total Discs" };
            constexpr std::string year { "Year" };
            constexpr std::string genre { "Genre" };
            constexpr std::string composer { "Composer" };
            constexpr std::string conductor { "Conductor" };
            constexpr std::string lyricist { "Lyricist" };
            constexpr std::string lyrics { "Lyrics" };
            constexpr std::string comment { "Comment" };
            constexpr std::string bpm { "BPM" };
            constexpr std::string length { "Length" };
            constexpr std::string compilation { "Compilation" };
            constexpr std::string publisherLabel { "Label" };
            constexpr std::string isrc { "ISRC" };
            constexpr std::string encoder { "Encoder" };
            constexpr std::string copyright { "Copyright" };
            constexpr std::string coverArt { "Cover Art" };

        }

        enum format {
            MP3,
            FLAC,
            M4A,
            OGG,
            OPUS,
            AAC,
            WMA,
            WAV,
            AIF,
            AIFF,
            ALAC,
        };

        typedef bimap<
             unordered_set_of<std::string>,
             unordered_set_of<std::string>
         > tagMap;

        tagMap& getMapTag(const format format);
    }

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