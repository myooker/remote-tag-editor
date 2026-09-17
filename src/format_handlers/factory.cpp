#include "factory.h"
#include "flac.h"
#include "mpeg4.h"
#include "mpeg.h"
#include "oggOpus.h"
#include "oggTag.h"

using namespace rte::music::handler;

std::unique_ptr<Interface> Factory::create(const std::string &extension) {
    if (extension == ".mp3")
        return std::make_unique<Mpeg>();
    if (extension == ".flac")
        return std::make_unique<Flac>();
    if (extension == ".m4a")
        return std::make_unique<Mpeg4>();
    if (extension == ".ogg")
        return std::make_unique<OggTag>();
    if (extension == ".opus")
        return std::make_unique<OggOpus>();

    return nullptr;
}
