//
// Created by myooker on 1/24/26.
//

#ifndef WEB_TAG_EDITOR_MPEGTAGHANDLER_H
#define WEB_TAG_EDITOR_MPEGTAGHANDLER_H

#include "../../include/musicTagHandler.h"
#include <id3v2tag.h>

namespace audioFormat {
    class mpegTagHandler : public musicTagHandler {
    public:
        static TagLib::ByteVector StringToIDv3Tag(const std::string &frameID);
        std::expected<json, std::string> listMusicTags(const std::string &filePath) override;
        static void removeTXXXFrame(TagLib::ID3v2::Tag *tag, const std::string &desc);
        static void addTXXXFrame(TagLib::ID3v2::Tag *tag, const std::string &desc, const std::string &text);
        crow::response removeMusicTag(const program::TagModification &tagStruct) override;
        crow::response addMusicTag(const program::TagModification &tagStruct) override;
        crow::response editMusicTags(const program::TagModification &tagStruct) override;
    };
} // audioFormat

#endif // WEB_TAG_EDITOR_MPEGTAGHANDLER_H