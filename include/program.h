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
        enum class format;

        namespace tag {
            constexpr std::string_view title { "Title" };
            constexpr std::string_view artist { "Artist" };
            constexpr std::string_view artistSort { "AritstSort" };
            constexpr std::string_view album { "Album" };
            constexpr std::string_view albumArtist { "AlbumArtist" };
            constexpr std::string_view albumArtistSort { "AlbumArtistSort" };
            constexpr std::string_view trackNumber { "Track Number" };
            constexpr std::string_view totalTracks { "Total Tracks" };
            constexpr std::string_view discNumber { "Disc Number" };
            constexpr std::string_view totalDiscs { "Total Discs" };
            constexpr std::string_view year { "Year" };
            constexpr std::string_view origyear { "Original Year" };
            constexpr std::string_view genre { "Genre" };
            constexpr std::string_view composer { "Composer" };
            constexpr std::string_view conductor { "Conductor" };
            constexpr std::string_view lyricist { "Lyricist" };
            constexpr std::string_view lyrics { "Lyrics" };
            constexpr std::string_view comment { "Comment" };
            constexpr std::string_view bpm { "BPM" };
            constexpr std::string_view length { "Length" };
            constexpr std::string_view mediatype { "Mediatype" };
            constexpr std::string_view compilation { "Compilation" };
            constexpr std::string_view publisherLabel { "Label" };
            constexpr std::string_view isrc { "ISRC" };
            constexpr std::string_view encoder { "Encoder" };
            constexpr std::string_view copyright { "Copyright" };
            constexpr std::string_view coverArt { "Cover Art" };

            struct tagRegistry {
                std::unordered_map<std::string, std::string> rawToNormalized;

                std::unordered_map<format, std::unordered_map<std::string, std::string>> normalizedToRaw;
            };

            const tagRegistry& getTagRegistry();
            std::string normalize(const std::string &rawTag);
            std::string denormalize(const std::string &normalizedTag, format format);
        }

        enum class format {
            MP3, FLAC, M4A,
            OGG, OPUS, AAC,
            WMA, WAV, AIF,
            AIFF, ALAC,
        };
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