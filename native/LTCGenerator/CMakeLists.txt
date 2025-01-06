cmake_minimum_required(VERSION 3.21)
project(LTCGenerator)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

set(LTC_GENERATOR_SOURCE
    "Dependencies/ltc_code/fit/dds.cpp"
    "src/main.cpp")

set(LTC_GENERATOR_HEADERS
    "Dependencies/ltc_code/fit/brdf_beckmann.h"
    "Dependencies/ltc_code/fit/brdf_disneyDiffuse.h"
    "Dependencies/ltc_code/fit/brdf_ggx.h"
    "Dependencies/ltc_code/fit/brdf.h"
    "Dependencies/ltc_code/fit/dds.h"
    "Dependencies/ltc_code/fit/export.h"
    "Dependencies/ltc_code/fit/float_to_half.h"
    "Dependencies/ltc_code/fit/LTC.h"
    "Dependencies/ltc_code/fit/nelder_mead.h"
    "Dependencies/ltc_code/fit/plot.h")

add_executable(LTCGenerator ${LTC_GENERATOR_SOURCE} ${LTC_GENERATOR_HEADERS})
target_include_directories(LTCGenerator PRIVATE "src")
target_include_directories(LTCGenerator PRIVATE "Dependencies/ltc_code/fit/")

if(DEFINED EMSCRIPTEN)
    target_link_options(LTCGenerator PRIVATE "-s NO_EXIT_RUNTIME=1")
    target_link_options(LTCGenerator PRIVATE "-s WASM=1")
    
    # Required for ES6
    target_link_options(LTCGenerator PRIVATE "-s ENVIRONMENT='web,worker'")
    target_link_options(LTCGenerator PRIVATE "-s STACK_SIZE=4000000")
    target_link_options(LTCGenerator PRIVATE "-s ASSERTIONS")
    target_link_options(LTCGenerator PRIVATE "-s ALLOW_MEMORY_GROWTH=1")
    target_link_options(LTCGenerator PRIVATE "-s MODULARIZE=1")
    target_link_options(LTCGenerator PRIVATE "-s EXPORT_ES6")
    target_link_options(LTCGenerator PRIVATE "-s INVOKE_RUN=0")
    target_link_options(LTCGenerator PRIVATE "--bind")
    
    target_compile_options(LTCGenerator PRIVATE -O3)
    #target_link_options(LTCGenerator PRIVATE "-s SIDE_MODULE=1")
endif()

target_include_directories(LTCGenerator PUBLIC "Dependencies/ltc_code/external/glm")

install(FILES
        "$<TARGET_FILE_DIR:LTCGenerator>/LTCGenerator.js"
        "$<TARGET_FILE_DIR:LTCGenerator>/LTCGenerator.wasm"
        DESTINATION "${PROJECT_SOURCE_DIR}/../../www/wasm")