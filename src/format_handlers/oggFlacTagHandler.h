//
// Created by myooker on 2/10/26.
//

#ifndef WEB_TAG_EDITOR_OGGFLACTAGHANDLER_H
#define WEB_TAG_EDITOR_OGGFLACTAGHANDLER_H
#include "../../include/ImusicTagHandler.h"

namespace audioFormat {
    class oggFlacTagHandler : public ImusicTagHandler {
    private:
        void ensureRteid(std::string *rteid, TagLib::Ogg::XiphComment *tag);
    public:
        std::expected<json, std::string> listMusicTags(const std::string &filePath) override;
        crow::response removeMusicTag(const program::TagModification &tagStruct, std::string *rteid = nullptr) override;
        crow::response addMusicTag(const program::TagModification &tagStruct, std::string *rteid = nullptr) override;
        crow::response editMusicTags(const program::TagModification &tagStruct, std::string *rteid = nullptr) override;
        tag::Picture getAlbumCover(const std::string& filePath) override {};
        void removeAlbumCover(const std::string& filePath) override {};
        void addAlbumCover(const std::string& filePath) override {};
    };
} // audioFormat

#endif // WEB_TAG_EDITOR_OGGFLACTAGHANDLER_H