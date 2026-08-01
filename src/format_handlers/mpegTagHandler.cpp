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

void mpegTagHandler::ensureRteid(std::string* rteid, TagLib::ID3v2::Tag* tag) {
    using namespace TagLib;
    const std::string rteDesc { tag::rteID };
    bool found = false;
    for (auto *frame : tag->frameList("TXXX")) {
        if (const auto *uf = dynamic_cast<ID3v2::UserTextIdentificationFrame*>(frame)) {
            if (uf->description().toCString(true) == rteDesc) {
                *rteid = uf->fieldList()[1].toCString(true);
                found = true;
                break;
            }
        }
    }
    if (!found)
        addTXXXFrame(tag, rteDesc, *rteid);
}

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
                const auto fieldsSize = fields.size();
                const std::string key = fields[0].to8Bit(true); // Assign TXXX description
                const std::string normalizedKey = tag::normalize(std::string(prefix::mp3) + key, fmt);

                if (fieldsSize == 2) { // If there's only description and its value
                    std::string value = fields[1].to8Bit(true); // Get single-value of TXXX description (tag field)
                    userdef[normalizedKey] = value;
                } else if (fieldsSize > 2) { // If there's description and multiple value
                    userdef[normalizedKey] = json::array();
                    for (unsigned int i { 1 }; i < fieldsSize; ++i) {
                        userdef[normalizedKey] += fields[i].to8Bit(true);
                    }
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

void mpegTagHandler::removeTXXXFrame(TagLib::ID3v2::Tag *tag, const std::string &desc, const TagLib::String &value) {
    using namespace TagLib;

    ID3v2::FrameList frames = tag->frameList("TXXX");
    for (auto *frame : frames) {
        auto *userFrame = dynamic_cast<ID3v2::UserTextIdentificationFrame*>(frame);
        if (!userFrame) // Continue searching for TXXX frame if it isn't
            continue;

        const std::string frameDesc = userFrame->description().toCString(true); // Extract description
        if (frameDesc != desc) // Searching for exact frame description (name)
            continue;

        // No specific value given - remove the whole frame.
        if (value.to8Bit().empty()) {
            CROW_LOG_DEBUG << "(" << __func__ << ")" << " frame (" << frameDesc << ") is removed";
            tag->removeFrame(frame);
            return;
        }

        // Remove only the matching value, keeping the frame's other values.
        // fieldList()[0] is the description, so values start at index 1.
        StringList values {};
        bool isDeleted = false;
        bool isSkip = true;
        for (auto &f : userFrame->fieldList()) {
            if (isSkip) {
                isSkip = false;
                continue;
            }

            if (f == value && !isDeleted) {
                isDeleted = true;
                continue;
            }
            values.append(f);
        }


        if (values.isEmpty()) {
            // Nothing left but the description - drop the whole frame.
            CROW_LOG_DEBUG << "(" << __func__ << ")" << " frame (" << frameDesc << ") is removed";
            tag->removeFrame(frame);
        } else {
            CROW_LOG_DEBUG << "(" << __func__ << ")" << " removing value (" << value << ") from frame (" << frameDesc << ")";
            userFrame->setText(values);
        }
        return;
    }
}

crow::response mpegTagHandler::removeMusicTag(const program::TagModification &tagStruct, std::string *rteid) {
    using namespace program::music;
    using namespace TagLib;
    const fs::path path { tagStruct.filePath };
    MPEG::File file { path.c_str() };

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

    const auto frameID = ByteVector(denormFieldType.c_str());
    const std::string frameIDstr { frameID.data(), frameID.size() };
    auto frames = tag->frameList(frameID);

    CROW_LOG_DEBUG << "(" << __func__ << ")" << " fieldtype is " << tagStruct.fieldType;
    CROW_LOG_DEBUG << "(" << __func__ << ")" << " fildtype to idv3tag " << denormFieldType;
    CROW_LOG_DEBUG << "(" << __func__ << ")" << " frames are " << frames.size() << " frames";

    if (frameIDstr.starts_with(prefix::mp3)) {
        const std::string desc = denormFieldType.substr(prefix::mp3.size());
        removeTXXXFrame(tag, desc, tagStruct.value);
    }

    if (!frames.isEmpty()) {
        StringList values {};
        bool isDeleted = false;
        for (auto &a : frames) {
            if (const auto *b = dynamic_cast<ID3v2::TextIdentificationFrame*>(a)) {
                for (const auto &v : b->fieldList()) {
                    if (v == tagStruct.value && !isDeleted) {
                        isDeleted = true;
                        continue;
                    }
                    values.append(v);
                }
            }
        }
        tag->removeFrames(frameID);
        auto *f = new ID3v2::TextIdentificationFrame(frameID);
        f->setText(values);
        tag->addFrame(f);
    }

    if (rteid) ensureRteid(rteid, tag);
    file.strip(MPEG::File::ID3v1);
    file.save(MPEG::File::AllTags, File::StripNone, static_cast<ID3v2::Version>(ver));
    return crow::response {200, "OK" };
}

void mpegTagHandler::addTXXXFrame(TagLib::ID3v2::Tag *tag, const std::string &desc, const TagLib::String &text) {
    TagLib::ID3v2::FrameList frames = tag->frameList("TXXX");

    CROW_LOG_DEBUG << "(" << __func__ << ")" << " TXXX frames size: " << frames.size();

    for (auto *frame : frames) {
        if (auto *userFrame = dynamic_cast<TagLib::ID3v2::UserTextIdentificationFrame*>(frame)) {
            const std::string frameDesc = userFrame->description().toCString(true);
            CROW_LOG_DEBUG << "(" << __func__ << ")" << " frame description: " << frameDesc;
            CROW_LOG_DEBUG << "(" << __func__ << ")" << " frame text: " << desc;
            if (frameDesc == desc) {
                // A frame already exists, so we need to append new value, keeping old ones
                const TagLib::StringList fields = userFrame->fieldList();
                TagLib::StringList values {};

                // fieldList()[0] is the description, so values start at index 1.
                // Filling values with current values of description
                for (unsigned int i { 1 }; i < fields.size(); ++i)
                    values.append(fields[i]);

                // Add our new value to list
                // and set frame's text with our list (old values + new value)
                values.append(text);
                userFrame->setText(values);
                return;
            }
        }
    }

    // If a frame does not exist, we simply create a new one
    // Set description and text, adding this new frame to our file (tag)
    auto *newFrame = new TagLib::ID3v2::UserTextIdentificationFrame(TagLib::String::UTF8);
    CROW_LOG_DEBUG << "(" << __func__ << ")" << " newFrame desc: " << desc;
    newFrame->setDescription(desc);
    CROW_LOG_DEBUG << "(" << __func__ << ")" << " newFrame text: " << text;
    newFrame->setText(text);
    tag->addFrame(newFrame);
}

void mpegTagHandler::editTXXXFrame(TagLib::ID3v2::Tag* tag, const std::string& desc, const program::TagModification& tagStruct) {
    using namespace program::music;
    TagLib::ID3v2::FrameList userFrames = tag->frameList("TXXX");
    TagLib::ID3v2::UserTextIdentificationFrame *match = nullptr;

    for (auto *frame : userFrames) {
        if (auto *userFrame = dynamic_cast<TagLib::ID3v2::UserTextIdentificationFrame*>(frame)) {
            if (userFrame->description().toCString(true) == desc) {
                match = userFrame;
                break;
            }
        }
    }

    if (!match) {
        CROW_LOG_DEBUG << "(" << __func__ << ")" << " user frame not found: " << desc;
        return;
    }

    // fieldList()[0] is the description, so skip it and start from the values.
    TagLib::StringList newValues {};
    bool isSkip = true;
    for (auto &f : match->fieldList()) {
        if (isSkip) {
            isSkip = false;
            continue;
        }

        if (f == tagStruct.replaceWhat)
            newValues.append(tagStruct.replaceWith);
        else
            newValues.append(f);
    }

    match->setText(newValues);
}

crow::response mpegTagHandler::addMusicTag(const program::TagModification &tagStruct, std::string *rteid) {
    using namespace program::music;
    using namespace TagLib;

    const fs::path path { tagStruct.filePath };
    MPEG::File file { path.c_str() };

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

    auto frameID = ByteVector(denormFieldType.c_str());
    auto frames = tag->frameList(frameID);
    const std::string frameIDstr { frameID.data(), frameID.size() };

    if (frameIDstr.starts_with(prefix::mp3)) {
        const std::string desc = denormFieldType.substr(5);
        addTXXXFrame(tag, desc, tagStruct.value);
        if (rteid) ensureRteid(rteid, tag);
        file.save(MPEG::File::AllTags, File::StripNone, static_cast<ID3v2::Version>(ver));
        CROW_LOG_DEBUG << "(" << __func__ << ") File saved!";
        return crow::response {200, "OK" };
    }

    if (frames.isEmpty()) {
        auto *newFrame = new ID3v2::TextIdentificationFrame(frameID);
        newFrame->setText(tagStruct.value);
        tag->addFrame(newFrame);
    } else if (auto *f = dynamic_cast<ID3v2::TextIdentificationFrame*>(frames.front())) {
        StringList values { f->fieldList() };
        values.append(tagStruct.value);
        f->setText(values);
    }

    if (rteid) ensureRteid(rteid, tag);
    file.save(MPEG::File::AllTags, File::StripNone, static_cast<ID3v2::Version>(ver));
    return crow::response {200, "OK" };
}

crow::response mpegTagHandler::editMusicTags(const program::TagModification &tagStruct, std::string *rteid) {
    using namespace program::music;
    using namespace TagLib;

    const fs::path path { tagStruct.filePath };
    MPEG::File file { path.c_str() };
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
    auto frameID = ByteVector(denormFieldType.c_str());
    auto frames = tag->frameList(frameID);
    const std::string frameIDstr { frameID.data(), frameID.size() };

    // Edit user-defined (TXXX) tags
    if (frameIDstr.starts_with(prefix::mp3)) {
        const std::string desc = denormFieldType.substr(5); // TXXX:
        editTXXXFrame(tag, desc, tagStruct);
        if (rteid) ensureRteid(rteid, tag);
        file.save(MPEG::File::AllTags, File::StripNone, static_cast<ID3v2::Version>(ver));
        CROW_LOG_DEBUG << "(" << __func__ << ") File saved!";
        return crow::response {200, "OK" };
    }

    CROW_LOG_WARNING << "frames.size(): " << frames.size() << '\n';
    StringList values {};
    for (const auto a : frames) {
        if (const auto *b = dynamic_cast<ID3v2::TextIdentificationFrame*>(a)) {
            for (const auto &v : b->fieldList()) {
                if (v == tagStruct.replaceWhat)
                    values.append(tagStruct.replaceWith);
                else
                    values.append(v);
            }
        }
    }

    tag->removeFrames(frameID);
    auto *newFrame = new ID3v2::TextIdentificationFrame(frameID);
    newFrame->setText(values);
    tag->addFrame(newFrame);
    if (rteid) ensureRteid(rteid, tag);
    file.save(MPEG::File::AllTags, File::StripNone, static_cast<ID3v2::Version>(ver));

    return crow::response { 200, "OK" };
}

// tag::Picture mpegTagHandler::getAlbumCover(const std::string& filePath) {
//     TagLib::MPEG::File file { filePath.c_str() };
//
//     tag::Picture data {};
//     if (file.hasID3v2Tag()) {
//         auto t = file.ID3v2Tag();
//         auto pictureByteVector = t->complexProperties("PICTURE")[0]["data"].toByteVector();
//         std::cout << "variant map: " << x[0] << '\n';
//         data.data = std::string(pictureByteVector.data(), pictureByteVector.size());
//         data.mimeType = x[0]["mimeType"].toString().toCString();
//         data.response = crow::response{ 200 };
//     }
//
//     return data;
// }
