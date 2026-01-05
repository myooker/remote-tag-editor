#ifndef WEB_TAG_EDITOR_MPEG_H
#define WEB_TAG_EDITOR_MPEG_H

#include <mpegfile.h>
#include <id3v2tag.h>
#include <textidentificationframe.h>
#include <nlohmann/json.hpp>

namespace MPEG {
    using json = nlohmann::json;
    using ordered_json = nlohmann::ordered_json;

    std::string IDv3TagToString(const TagLib::ByteVector &frameID);
    json listMusicTags(const std::string &path);
}

#endif //WEB_TAG_EDITOR_MPEG_H