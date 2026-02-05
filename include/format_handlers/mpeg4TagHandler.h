//
// Created by myooker on 1/27/26.
//

#ifndef WEB_TAG_EDITOR_MPEG4TAGHANDLER_H
#define WEB_TAG_EDITOR_MPEG4TAGHANDLER_H

#include <tstring.h>

#include "../musicTagHandler.h"

namespace audioFormat {
    // This struct represent the following table:
    // https://atomicparsley.sourceforge.net/mpeg-4files.html
    // It will contain both values: name and flag (data type)
    struct atomEntity {
        std::string name{};
        std::string flag{};
    };

    class mpeg4TagHandler : public musicTagHandler {
    public:
        static atomEntity atomToString(const std::string &atom);
        //static
        std::expected<json, std::string> listMusicTags(const std::string &filePath) override;
        crow::response removeMusicTag(const std::string &filePath, const std::string &fieldType, const std::string &value) override;
        crow::response addMusicTag(const std::string &filePath, const std::string &fieldType, const std::string &value) override;
        crow::response editMusicTags(const std::string &filePath, const std::string &fieldType, const std::string &replaceWith) override;
    };
} // audioFormat

#endif //WEB_TAG_EDITOR_MPEG4TAGHANDLER_H