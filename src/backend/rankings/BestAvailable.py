import time

from Rankings.ParseRankings import parseCSV
from Rankings.RankingsUtil import *
from Rankings.Constants import *
from EditMe import *

# How often (in seconds) the draft ranker will refresh
REFRESH_TIME = 30

# The program will refresh your draft this many times before automatically stopping
# (you can re-run if your draft is longer)
REFRESH_COUNT = 240

def printBestAvailable(fileName=FILE_NAME, draftID=DRAFT_ID):
    for i in range(REFRESH_COUNT):
        printTopAvailablePlayersMessage()
        printBestAvailableHelper(fileName, draftID)
        time.sleep(REFRESH_TIME)
        addNewLineSpacing()

def printBestAvailableHelper(fileName, draftID):
    playerRankings = parseCSV(fileName)
    playersDrafted = getPlayersDrafted(draftID)

    for i in range(len(playerRankings) - 1, -1, -1):
        for item in playersDrafted:
            if item == playerRankings[i]:
                playerRankings.remove(item)
                break

    # BY POSITION RANKINGS
    printTopXPlayersForPositions([POS_QB], playerRankings, 5)
    printTopXPlayersForPositions([POS_RB], playerRankings, 5)
    printTopXPlayersForPositions([POS_WR], playerRankings, 5)
    printTopXPlayersForPositions([POS_TE], playerRankings, 5)
    printTopXPlayersForPositions([POS_K], playerRankings, 5)

    # FLEX RANKINGS
    printTopXPlayersForPositions([POS_RB, POS_WR, POS_TE], playerRankings, 10)

    # ALL RANKINGS
    printTopXPlayersForPositions([POS_QB, POS_RB, POS_WR, POS_TE, POS_K], playerRankings, 10)
