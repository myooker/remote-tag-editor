//
// Created by myooker on 2/10/26.
//

#include "../../include/format_handlers/oggTagHandler.h"
#include "../../include/scopeTimer.h"

#include <fileref.h>
#include <vorbisfile.h>
#include <oggflacfile.h>
#include <opusfile.h>
#include <speexfile.h>

#include "../../include/format_handlers/oggFlacTagHandler.h"
#include "../../include/format_handlers/oggOpusTagHandler.h"
#include "../../include/format_handlers/oggSpeexTagHandler.h"
#include "../../include/format_handlers/oggVorbisTagHandler.h"

using namespace audioFormat;

std::unique_ptr<musicTagHandler> oggTagHandler::codecHandler(const std::string &filePath) {
    const TagLib::FileRef fileRef { filePath.c_str() };

    if (fileRef.isNull()) {
        CROW_LOG_ERROR << "(" << __func__ << ") " << filePath << " is invalid!";
        return nullptr;
    }

    const auto file = fileRef.file();

    if (auto *codec = dynamic_cast<TagLib::Ogg::Vorbis::File *>(file)) {
        return std::make_unique<oggVorbisTagHandler>();
    }
    if (auto *codec = dynamic_cast<TagLib::Ogg::FLAC::File *>(file)) {
        return std::make_unique<oggFlacTagHandler>();
    }
    if (auto *codec = dynamic_cast<TagLib::Ogg::Opus::File *>(file)) {
        return std::make_unique<oggOpusTagHandler>();
    }
    if (auto *codec = dynamic_cast<TagLib::Ogg::Speex::File *>(file)) {
        return std::make_unique<oggSpeexTagHandler>();
    }
    return nullptr;
}

std::expected<json, std::string> oggTagHandler::listMusicTags(const std::string &filePath) {
    return codecHandler(filePath)->listMusicTags(filePath);
}

crow::response oggTagHandler::removeMusicTag(const std::string &filePath, const std::string &fieldType, const std::string &value) {
   return codecHandler(filePath)->removeMusicTag(filePath, fieldType, value);
}

crow::response oggTagHandler::addMusicTag(const std::string &filePath, const std::string &fieldType, const std::string &value) {
   return codecHandler(filePath)->addMusicTag(filePath, fieldType, value);
}

crow::response oggTagHandler::editMusicTags(const std::string &filePath, const std::string &fieldType, const std::string &replaceWith) {
   return codecHandler(filePath)->editMusicTags(filePath, fieldType, replaceWith);
}

crow::response oggTagHandler::editMusicTags(const std::string &filePath, const std::string &fieldType, const std::string &replaceWhat, const std::string &replaceWith) {
   return codecHandler(filePath)->editMusicTags(filePath, fieldType, replaceWhat, replaceWith);
}

