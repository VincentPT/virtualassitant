-- MySQL dump 10.13  Distrib 5.7.23, for Win64 (x86_64)
--
-- ------------------------------------------------------
-- Server version	5.7.23-log

--
-- Table structure for table `useraccesstoken`
--

DROP TABLE IF EXISTS `useraccesstoken`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `useraccesstoken` (
  `userid` varchar(63) COLLATE utf8_bin NOT NULL,
  `username` varchar(255) COLLATE utf8_bin DEFAULT NULL,
  `token` varchar(255) COLLATE utf8_bin NOT NULL,
  PRIMARY KEY (`userid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_bin;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `pageaccesstoken`
--

DROP TABLE IF EXISTS `pageaccesstoken`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `pageaccesstoken` (
  `pageid` varchar(63) COLLATE utf8_bin NOT NULL,
  `pagename` varchar(255) COLLATE utf8_bin DEFAULT NULL,
  `userid` varchar(63) COLLATE utf8_bin NOT NULL,
  `token` varchar(255) COLLATE utf8_bin NOT NULL,
  PRIMARY KEY (`pageid`),
  KEY `fk_page_user_token` (`userid`),
  CONSTRAINT `fk_page_user_token` FOREIGN KEY (`userid`) REFERENCES `useraccesstoken` (`userid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_bin;
/*!40101 SET character_set_client = @saved_cs_client */;


-- Dump completed on 2018-09-26 16:49:47
