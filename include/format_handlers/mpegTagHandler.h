//
// Created by myooker on 1/24/26.
//

#ifndef WEB_TAG_EDITOR_MPEGTAGHANDLER_H
#define WEB_TAG_EDITOR_MPEGTAGHANDLER_H

#include <id3v2tag.h>
#include "../musicTagHandler.h"

namespace audioFormat {
    class mpegTagHandler : public musicTagHandler {
    public:
        static std::string IDv3TagToString(const TagLib::ByteVector &frameID);
        static TagLib::ByteVector StringToIDv3Tag(const std::string &frameID);
        std::expected<json, std::string> listMusicTags(const std::string &filePath) override;
        static void removeTXXXFrame(TagLib::ID3v2::Tag *tag, const std::string &desc);
        static void addTXXXFrame(TagLib::ID3v2::Tag *tag, const std::string &desc, const std::string &text);
        crow::response removeMusicTag(const std::vector<fs::path> &filePaths, const std::string &fieldType, const std::string &value) override;
        crow::response addMusicTag(const std::vector<fs::path> &filePaths, const std::string &fieldType, const std::string &value) override;
        crow::response editMusicTags(const std::vector<fs::path> &filePaths, const std::string &fieldType, const std::string &replaceWith) override;
    };
} // audioFormat

#endif //WEB_TAG_EDITOR_MPEGTAGHANDLER_H