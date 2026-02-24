#include "../include/program.h"

#include <boost/bimap.hpp>
#include <boost/bimap/unordered_set_of.hpp>
#include <string>

using namespace boost::bimaps;
using namespace program;

namespace program {
    tagMap &getMapTag() {
        static tagMap mapTag;

        // TITLE
        mapTag.insert({"TITLE", "Title"});
        mapTag.insert({"TIT2", "Title"});
        mapTag.insert({"©nam", "Title"});

        // ARTIST
        mapTag.insert({"ARTIST", "Artist"});
        mapTag.insert({"TPE1", "Artist"});
        mapTag.insert({"©ART", "Artist"});

        // ALBUM
        mapTag.insert({"ALBUM", "Album"});
        mapTag.insert({"TALB", "Album"});
        mapTag.insert({"©alb", "Album"});

        // ALBUM ARTIST
        mapTag.insert({"ALBUMARTIST", "Album Artist"});
        mapTag.insert({"TPE2", "Album Artist"});
        mapTag.insert({"aART", "Album Artist"});

        // TRACK NUMBER
        mapTag.insert({"TRACKNUMBER", "Track Number"});
        mapTag.insert({"TRCK", "Track Number"});
        mapTag.insert({"trkn", "Track Number"});

        // DISC NUMBER
        mapTag.insert({"DISCNUMBER", "Disc Number"});
        mapTag.insert({"TPOS", "Disc Number"});
        mapTag.insert({"disk", "Disc Number"});

        // YEAR
        mapTag.insert({"DATE", "Year"});
        mapTag.insert({"TDRC", "Year"});
        mapTag.insert({"TYER", "Year"});
        mapTag.insert({"©day", "Year"});

        // GENRE
        mapTag.insert({"GENRE", "Genre"});
        mapTag.insert({"TCON", "Genre"});
        mapTag.insert({"©gen", "Genre"});

        // COMPOSER
        mapTag.insert({"COMPOSER", "Composer"});
        mapTag.insert({"TCOM", "Composer"});
        mapTag.insert({"©wrt", "Composer"});

        // CONDUCTOR
        mapTag.insert({"CONDUCTOR", "Conductor"});
        mapTag.insert({"TPE3", "Conductor"});
        mapTag.insert({"----:com.apple.iTunes:CONDUCTOR", "Conductor"});

        // LYRICIST
        mapTag.insert({"LYRICIST", "Lyricist"});
        mapTag.insert({"TEXT", "Lyricist"});
        mapTag.insert({"©lyr", "Lyricist"});

        // LYRICS
        mapTag.insert({"LYRICS", "Lyrics"});
        mapTag.insert({"USLT", "Lyrics"});
        mapTag.insert({"©lyr", "Lyrics"});

        // COMMENT
        mapTag.insert({"COMMENT", "Comment"});
        mapTag.insert({"COMM", "Comment"});
        mapTag.insert({"©cmt", "Comment"});

        // BPM
        mapTag.insert({"BPM", "BPM"});
        mapTag.insert({"TBPM", "BPM"});
        mapTag.insert({"tmpo", "BPM"});

        // COMPILATION
        mapTag.insert({"COMPILATION", "Compilation"});
        mapTag.insert({"TCMP", "Compilation"});
        mapTag.insert({"cpil", "Compilation"});

        // PUBLISHER / LABEL
        mapTag.insert({"LABEL", "Label"});
        mapTag.insert({"TPUB", "Label"});
        mapTag.insert({"©pub", "Label"});

        // ISRC
        mapTag.insert({"ISRC", "ISRC"});
        mapTag.insert({"TSRC", "ISRC"});
        mapTag.insert({"----:com.apple.iTunes:ISRC", "ISRC"});

        // ENCODER
        mapTag.insert({"ENCODER", "Encoder"});
        mapTag.insert({"TENC", "Encoder"});
        mapTag.insert({"©too", "Encoder"});

        // COPYRIGHT
        mapTag.insert({"COPYRIGHT", "Copyright"});
        mapTag.insert({"TCOP", "Copyright"});
        mapTag.insert({"cprt", "Copyright"});

        // COVER ART
        mapTag.insert({"METADATA_BLOCK_PICTURE", "Cover Art"});
        mapTag.insert({"APIC", "Cover Art"});
        mapTag.insert({"covr", "Cover Art"});

        return mapTag;
    }
}