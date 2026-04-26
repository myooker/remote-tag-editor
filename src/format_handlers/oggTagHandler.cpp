//
// Created by myooker on 2/10/26.
//

#include "oggTagHandler.h"
#include "../../include/scopeTimer.h"

#include <fileref.h>
#include <vorbisfile.h>
#include <oggflacfile.h>
#include <opusfile.h>
#include <speexfile.h>

#include "oggFlacTagHandler.h"
#include "oggOpusTagHandler.h"
#include "oggSpeexTagHandler.h"
#include "oggVorbisTagHandler.h"

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

crow::response oggTagHandler::removeMusicTag(const program::TagModification &tagStruct) {
   return codecHandler(tagStruct.filePath)->removeMusicTag(tagStruct);
}

crow::response oggTagHandler::addMusicTag(const program::TagModification &tagStruct) {
   return codecHandler(tagStruct.filePath)->addMusicTag(tagStruct);
}

crow::response oggTagHandler::editMusicTags(const program::TagModification &tagStruct) {
   return codecHandler(tagStruct.filePath)->editMusicTags(tagStruct);
}

std::expected<std::string, bool> oggTagHandler::hasRTEID(const std::string& filePath) {
    return codecHandler(filePath)->hasRTEID(filePath);
}