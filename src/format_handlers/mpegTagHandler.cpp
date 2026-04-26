//
// Created by myooker on 1/24/26.
//

#include "mpegTagHandler.h"
#include "../../include/music.h"

#include <mpegfile.h>
#include <textidentificationframe.h>
#include <id3v2tag.h>
#include <id3v1tag.h>

using namespace audioFormat;

std::expected<json, std::string> mpegTagHandler::listMusicTags(const std::string &filePath) {
    using namespace program::music;
    TagLib::MPEG::File file { filePath.c_str() };

    if (!file.isValid()) {
        CROW_LOG_ERROR << "(" << __func__ << ") " << filePath << " is not valid";
        return std::unexpected("The file is not valid");
    }

    if (!file.hasID3v2Tag()) {
        CROW_LOG_ERROR << "(" << __func__ << ") " << filePath << " does not have ID3v2Tag";
        return std::unexpected("The file does not have ID3v2Tag");
    }

    json base = json::object();
    json userdef = json::object();

    const auto *tag = file.ID3v2Tag();
    const auto ver = tag->header()->majorVersion();
    const auto fmt = (ver >= 4) ? format::ID3v24 : format::ID3v23;

    const auto map = tag->frameListMap();
    for (const auto &pair : map) {
        const auto frameID = pair.first;
        const auto frameList = pair.second;
        for (auto *frame : frameList) {
            const auto *user = dynamic_cast<TagLib::ID3v2::UserTextIdentificationFrame*>(frame);
            if (user) {
                const auto &fields = user->fieldList();
                if (fields.size() >= 2) {
                    const std::string key = fields[0].to8Bit(true);
                    const std::string normalizedKey = tag::normalize(std::string(prefix::mp3) + key, fmt);
                    std::string value = fields[1].to8Bit(true);
                    userdef[normalizedKey] = value;
                }
                continue;
            }
            const auto *textFrame = dynamic_cast<TagLib::ID3v2::TextIdentificationFrame*>(frame);
            if (textFrame) {
                const auto list = textFrame->fieldList();
                std::string frameKey { frameID.data(), frameID.size() };
                frameKey = tag::normalize(frameKey, fmt);

                // If there's only one frame, just assign it to the id
                // Otherwise make an array of frames of frameID name
                if (list.size() == 1) {
                    base[frameKey] = list.toString().to8Bit(true);
                } else if (list.size() > 1) {
                    base[frameKey] = json::array();
                    for (const auto &a : list) {
                        base[frameKey] += a.to8Bit(true);
                    }
                }
            }
        }
    }
    for (const auto &a : userdef.items()) {
        base[a.key()] = a.value();
    }
    return base;
}

void mpegTagHandler::removeTXXXFrame(TagLib::ID3v2::Tag *tag, const std::string &desc) {
    TagLib::ID3v2::FrameList frames = tag->frameList("TXXX");

    CROW_LOG_DEBUG << "(" << __func__ << ")" << " TXXX frames size: " << frames.size();

    for (auto *frame : frames) {
        if (const auto *userFrame = dynamic_cast<TagLib::ID3v2::UserTextIdentificationFrame*>(frame)) {
            const std::string frameDesc = userFrame->description().toCString(true);
            CROW_LOG_DEBUG << "(" << __func__ << ")" << " frame description: " << frameDesc;
            CROW_LOG_DEBUG << "(" << __func__ << ")" << " description " << desc;
            if (frameDesc == desc) {
                CROW_LOG_DEBUG << "(" << __func__ << ")" << " frame (" << frameDesc << ") is removed";
                tag->removeFrame(frame);
                return;
            }
        }
    }
}

crow::response mpegTagHandler::removeMusicTag(const program::TagModification &tagStruct) {
    using namespace program::music;
    const fs::path path { tagStruct.filePath };
    TagLib::MPEG::File file { path.c_str() };

    if (!file.isValid()) {
        return crow::response {500, "Object is not valid"};
    }

    if (!file.hasID3v2Tag()) {
        return crow::response {500, "Object does not have an ID3v2.* Tag"};
    }

    auto *tag = file.ID3v2Tag();

    const int ver = tag->header()->majorVersion();
    const auto fmt = (ver >= 4) ? format::ID3v24 : format::ID3v23;
    const std::string denormFieldType = tag::denormalize(tagStruct.fieldType, fmt);

    const auto frameID = TagLib::ByteVector(denormFieldType.c_str());
    const std::string frameIDstr { frameID.data(), frameID.size() };
    auto frames = tag->frameList(frameID);

    CROW_LOG_DEBUG << "(" << __func__ << ")" << " fieldtype is " << tagStruct.fieldType;
    CROW_LOG_DEBUG << "(" << __func__ << ")" << " fildtype to idv3tag " << denormFieldType;
    CROW_LOG_DEBUG << "(" << __func__ << ")" << " frames are " << frames.size() << " frames";

    if (frameIDstr.starts_with(prefix::mp3)) {
        const std::string desc = denormFieldType.substr(prefix::mp3.size());
        removeTXXXFrame(tag, desc);
        file.save(TagLib::MPEG::File::AllTags, TagLib::File::StripNone, static_cast<TagLib::ID3v2::Version>(ver));
    } else if (!frames.isEmpty()) {
        auto *frame = frames.front();
        tag->removeFrame(frame);
        file.strip(TagLib::MPEG::File::ID3v1);
        file.save(TagLib::MPEG::File::AllTags, TagLib::File::StripNone, static_cast<TagLib::ID3v2::Version>(ver));
    }

    return crow::response {200, "OK" };
}

void mpegTagHandler::addTXXXFrame(TagLib::ID3v2::Tag *tag, const std::string &desc, const std::string &text) {
    TagLib::ID3v2::FrameList frames = tag->frameList("TXXX");

    CROW_LOG_DEBUG << "(" << __func__ << ")" << " TXXX frames size: " << frames.size();

    for (auto *frame : frames) {
        if (const auto *userFrame = dynamic_cast<TagLib::ID3v2::UserTextIdentificationFrame*>(frame)) {
            const std::string frameDesc = userFrame->description().toCString(true);
            CROW_LOG_DEBUG << "(" << __func__ << ")" << " frame description: " << frameDesc;
            CROW_LOG_DEBUG << "(" << __func__ << ")" << " frame text: " << desc;
            if (frameDesc == desc) {
                CROW_LOG_DEBUG << "(" << __func__ << ")" << " found conflicting " << desc;
                CROW_LOG_DEBUG << "(" << __func__ << ")" << " removing " << desc;
                tag->removeFrame(frame);
                break;
            }
        }
    }

    auto *newFrame = new TagLib::ID3v2::UserTextIdentificationFrame(TagLib::String::UTF8);
    CROW_LOG_DEBUG << "(" << __func__ << ")" << " newFrame desc: " << desc;
    newFrame->setDescription(desc);
    CROW_LOG_DEBUG << "(" << __func__ << ")" << " newFrame text: " << text;
    newFrame->setText(TagLib::String{text, TagLib::String::UTF8});
    tag->addFrame(newFrame);
}

crow::response mpegTagHandler::addMusicTag(const program::TagModification &tagStruct) {
    using namespace program::music;
    const fs::path path { tagStruct.filePath };
    TagLib::MPEG::File file { path.c_str() };

    if (!file.isValid()) {
        CROW_LOG_DEBUG << "(" << __func__ << ")  The file is not valid: " << path;
        return crow::response {500, "File is not valid"};
    }
    if (!file.hasID3v2Tag()) {
        CROW_LOG_DEBUG << "(" << __func__ << ")  The file does not have an ID3v2Tag: " << path;
        return crow::response {500, "File does not have an ID3v2Tag"};
    }

    auto *tag = file.ID3v2Tag();

    const auto ver = tag->header()->majorVersion();
    const auto fmt = (ver >= 4) ? format::ID3v24 : format::ID3v23;
    const std::string denormFieldType = tag::denormalize(tagStruct.fieldType, fmt);

    auto frameID = TagLib::ByteVector(denormFieldType.c_str());
    auto frames = tag->frameList(frameID);
    const std::string frameIDstr { frameID.data(), frameID.size() };

    TagLib::ID3v2::Frame *newFrame = new TagLib::ID3v2::TextIdentificationFrame(frameID);
    newFrame->setText(TagLib::String{tagStruct.value, TagLib::String::UTF8});

    if (frameIDstr.starts_with(prefix::mp3)) {
        const std::string desc = denormFieldType.substr(5);
        addTXXXFrame(tag, desc, tagStruct.value);
        file.save(TagLib::MPEG::File::AllTags, TagLib::File::StripNone, static_cast<TagLib::ID3v2::Version>(ver));
        CROW_LOG_DEBUG << "(" << __func__ << ") File saved!";
        return crow::response {200, "OK" };
    }

    if (frames.isEmpty()) {
        CROW_LOG_DEBUG << "(" << __func__ << ") Adding new frame to the file...";
        tag->addFrame(newFrame);
        file.save(TagLib::MPEG::File::AllTags, TagLib::File::StripNone, static_cast<TagLib::ID3v2::Version>(ver));
        CROW_LOG_DEBUG << "(" << __func__ << ") File saved!";
    } else {
        CROW_LOG_DEBUG << "(" << __func__ << ") Frame " << frameID.data() << " already exists in the file: " << path;
        CROW_LOG_DEBUG << "(" << __func__ << ") Skipping...";
    }

    return crow::response {200, "OK" };
}

crow::response mpegTagHandler::editMusicTags(const program::TagModification &tagStruct) {
    using namespace program::music;
    const fs::path path { tagStruct.filePath };
    TagLib::MPEG::File file { path.c_str() };
    if (!file.isValid()) {
        CROW_LOG_DEBUG << "(" << __func__ << ")  The file is not valid: " << path;
        return crow::response {500, "File is not valid"};
    }
    if (!file.hasID3v2Tag()) {
        CROW_LOG_DEBUG << "(" << __func__ << ")  The file does not have an ID3v2Tag: " << path;
        return crow::response {500, "File does not have an ID3v2Tag"};
    }

    auto *tag = file.ID3v2Tag();
    const auto ver = tag->header()->majorVersion();
    const auto fmt = (ver >= 4) ? format::ID3v24 : format::ID3v23;
    const std::string denormFieldType = tag::denormalize(tagStruct.fieldType, fmt);
    auto frameID = TagLib::ByteVector(denormFieldType.c_str());
    auto frames = tag->frameList(frameID);
    const std::string frameIDstr { frameID.data(), frameID.size() };
    TagLib::ID3v2::Frame *newFrame = new TagLib::ID3v2::TextIdentificationFrame(frameID);

    if (frameIDstr.starts_with(prefix::mp3)) {
        const std::string desc = denormFieldType.substr(5);
        addTXXXFrame(tag, desc, tagStruct.replaceWith);
        file.save(TagLib::MPEG::File::AllTags, TagLib::File::StripNone, static_cast<TagLib::ID3v2::Version>(ver));
        CROW_LOG_DEBUG << "(" << __func__ << ") File saved!";
        return crow::response {200, "OK" };
    }

    newFrame->setText(TagLib::String{tagStruct.replaceWith, TagLib::String::UTF8});
    CROW_LOG_DEBUG << "(" << __func__ << ") Removing existing frame...";
    tag->removeFrames(frameID);
    CROW_LOG_DEBUG << "(" << __func__ << ") Adding new frame...";
    tag->addFrame(newFrame);
    file.save(TagLib::MPEG::File::AllTags, TagLib::File::StripNone, static_cast<TagLib::ID3v2::Version>(ver));
    CROW_LOG_DEBUG << "(" << __func__ << ") File saved!";

    return crow::response {200, "OK" };
}

std::expected<std::string, bool> mpegTagHandler::hasRTEID(const std::string &filePath) {
    using namespace program::music;
    TagLib::MPEG::File file { filePath.c_str() };

    if (!file.isValid()) {
        CROW_LOG_DEBUG << "(" << __func__ << ")  The file is not valid: " << filePath;
        return std::unexpected(false);
    }

    if (!file.hasID3v2Tag()) return std::unexpected(false);

    const std::string desc { tag::rteID };
    for (auto *frame : file.ID3v2Tag()->frameList("TXXX")) {
        if (const auto *userFrame = dynamic_cast<TagLib::ID3v2::UserTextIdentificationFrame*>(frame);
            userFrame && userFrame->description().toCString(true) == desc)
            return userFrame->fieldList()[1].toCString(true);
    }

    return std::unexpected(false);
}