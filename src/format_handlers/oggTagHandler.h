//
// Created by myooker on 2/10/26.
//

#ifndef WEB_TAG_EDITOR_OGGTAGHANDLER_H
#define WEB_TAG_EDITOR_OGGTAGHANDLER_H

#include "../../include/ImusicTagHandler.h"

namespace audioFormat {
    class oggTagHandler : public ImusicTagHandler {
    private:
        std::string m_filePath{};
    public:
        std::expected<json, std::string> listMusicTags(const std::string &filePath) override;
        crow::response removeMusicTag(const program::TagModification &tagStruct, std::string *rteid = nullptr) override;
        crow::response addMusicTag(const program::TagModification &tagStruct, std::string *rteid = nullptr) override;
        crow::response editMusicTags(const program::TagModification &tagStruct, std::string *rteid = nullptr) override;
        tag::Picture getAlbumCover(const std::string& filePath) override {};
        void removeAlbumCover(const std::string& filePath) override {};
        void addAlbumCover(const std::string& filePath) override {};
    private:
        std::unique_ptr<ImusicTagHandler> codecHandler(const std::string &filePath);
    };
} // audioFormat

#endif // WEB_TAG_EDITOR_OGGTAGHANDLER_H