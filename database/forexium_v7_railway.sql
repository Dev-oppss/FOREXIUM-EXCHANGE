-- FOREXIUM v7 - Railway compatible
-- Base generee depuis: C:\Users\janea\Downloads\forexium_v7 (1).sql
-- Ajustements:
-- - suppression des clauses proprietaires phpMyAdmin dans les vues
-- - compatibilite comptes.type_compte avec depot
-- - compatibilite user_id VARCHAR(50) avec le backend actuel
-- - ajout des colonnes paiement manquantes dans transactions
-- - transaction_parent_id compatible avec les IDs TX_...
-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Hôte : 127.0.0.1:3306
-- Généré le : mar. 09 juin 2026 à 22:25
-- Version du serveur : 9.1.0
-- Version de PHP : 8.3.14

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Base de données : `forexium_v7`
--

-- --------------------------------------------------------

--
-- Structure de la table `comptes`
--

DROP TABLE IF EXISTS `comptes`;
CREATE TABLE IF NOT EXISTS `comptes` (
  `id` int NOT NULL AUTO_INCREMENT,
  `type_compte` enum('caisse','banque','depot') NOT NULL,
  `montant` decimal(15,2) DEFAULT '0.00',
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `type_compte` (`type_compte`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Structure de la table `comptes_clients`
--

DROP TABLE IF EXISTS `comptes_clients`;
CREATE TABLE IF NOT EXISTS `comptes_clients` (
  `id` int NOT NULL AUTO_INCREMENT,
  `nom` varchar(100) NOT NULL,
  `prenom` varchar(100) DEFAULT NULL,
  `ville` varchar(100) DEFAULT NULL,
  `adresse` text,
  `quartier` varchar(100) DEFAULT NULL,
  `telephone` varchar(20) DEFAULT NULL,
  `solde` decimal(15,2) DEFAULT '0.00',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `numero` varchar(20) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_nom` (`nom`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Structure de la table `comptes_fournisseurs`
--

DROP TABLE IF EXISTS `comptes_fournisseurs`;
CREATE TABLE IF NOT EXISTS `comptes_fournisseurs` (
  `id` int NOT NULL AUTO_INCREMENT,
  `nom` varchar(100) NOT NULL,
  `prenom` varchar(100) DEFAULT NULL,
  `ville` varchar(100) DEFAULT NULL,
  `adresse` text,
  `telephone` varchar(20) DEFAULT NULL,
  `solde_xaf` decimal(15,2) DEFAULT '0.00',
  `solde_usdt` decimal(15,6) DEFAULT '0.000000',
  `dette_usdt` decimal(15,6) DEFAULT '0.000000',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_nom` (`nom`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Structure de la table `devises_personnalisees`
--

DROP TABLE IF EXISTS `devises_personnalisees`;
CREATE TABLE IF NOT EXISTS `devises_personnalisees` (
  `id` int NOT NULL AUTO_INCREMENT,
  `code` varchar(10) NOT NULL,
  `nom` varchar(50) NOT NULL,
  `taux_conversion` decimal(15,6) NOT NULL DEFAULT '1.000000',
  `description` text,
  `is_default` tinyint(1) DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `code` (`code`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Structure de la table `distribution_partenaires`
--

DROP TABLE IF EXISTS `distribution_partenaires`;
CREATE TABLE IF NOT EXISTS `distribution_partenaires` (
  `id` int NOT NULL AUTO_INCREMENT,
  `transaction_id` varchar(50) DEFAULT NULL,
  `role` enum('porteur','associe') NOT NULL,
  `benefice_visible` decimal(15,2) DEFAULT '0.00',
  `benefice_cache` decimal(15,2) DEFAULT '0.00',
  `pourcentage` decimal(5,2) DEFAULT '0.00',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_tx` (`transaction_id`),
  KEY `idx_role` (`role`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Structure de la table `logs`
--

DROP TABLE IF EXISTS `logs`;
CREATE TABLE IF NOT EXISTS `logs` (
  `id` varchar(50) NOT NULL,
  `user_id` varchar(50) DEFAULT NULL,
  `type_evenement` varchar(50) NOT NULL,
  `description` text,
  `date_heure` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_date_type` (`date_heure`,`type_evenement`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Structure de la table `payment_history`
--

DROP TABLE IF EXISTS `payment_history`;
CREATE TABLE IF NOT EXISTS `payment_history` (
  `id` int NOT NULL AUTO_INCREMENT,
  `transaction_type` enum('client','supplier') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `transaction_id` varchar(50) NOT NULL,
  `related_id` int NOT NULL,
  `amount_paid` decimal(12,2) NOT NULL,
  `payment_method` enum('USDT','XAF','CASH') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'CASH',
  `previous_remaining` decimal(12,2) NOT NULL,
  `new_remaining` decimal(12,2) NOT NULL,
  `is_full_payment` tinyint(1) DEFAULT '0',
  `payment_timestamp` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `notes` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `created_by` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_transaction` (`transaction_type`,`transaction_id`),
  KEY `idx_related` (`related_id`),
  KEY `idx_payment_time` (`payment_timestamp`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Structure de la table `repartition_profits`
--

DROP TABLE IF EXISTS `repartition_profits`;
CREATE TABLE IF NOT EXISTS `repartition_profits` (
  `id` int NOT NULL AUTO_INCREMENT,
  `role` enum('porteur','associe') NOT NULL,
  `pourcentage_defaut` decimal(5,2) DEFAULT '70.00',
  `total_accumule_visible` decimal(15,2) DEFAULT '0.00',
  `total_accumule_cache` decimal(15,2) DEFAULT '0.00',
  `distribution_active` tinyint(1) DEFAULT '0',
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `role` (`role`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Structure de la table `settings`
--

DROP TABLE IF EXISTS `settings`;
CREATE TABLE IF NOT EXISTS `settings` (
  `setting_key` varchar(50) NOT NULL,
  `valeur` text NOT NULL,
  `description` text,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`setting_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Structure de la table `stock`
--

DROP TABLE IF EXISTS `stock`;
CREATE TABLE IF NOT EXISTS `stock` (
  `id` int NOT NULL AUTO_INCREMENT,
  `devise` varchar(10) NOT NULL,
  `quantite` decimal(15,6) NOT NULL DEFAULT '0.000000',
  `cmup` decimal(15,6) NOT NULL DEFAULT '0.000000',
  `valeur_totale` decimal(15,2) NOT NULL DEFAULT '0.00',
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `devise` (`devise`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Structure de la table `supplier_payment_details`
--

DROP TABLE IF EXISTS `supplier_payment_details`;
CREATE TABLE IF NOT EXISTS `supplier_payment_details` (
  `id` int NOT NULL AUTO_INCREMENT,
  `transaction_id` varchar(50) NOT NULL,
  `supplier_id` int NOT NULL,
  `original_amount` decimal(12,2) NOT NULL,
  `currency` enum('USDT','XAF') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'USDT',
  `amount_paid` decimal(12,2) DEFAULT '0.00',
  `remaining_amount` decimal(12,2) NOT NULL,
  `payment_method` enum('USDT','XAF') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'USDT',
  `payment_date` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `due_date` timestamp NULL DEFAULT NULL,
  `is_partial` tinyint(1) DEFAULT '0',
  `last_updated` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_supplier_transaction` (`supplier_id`,`transaction_id`),
  KEY `idx_supplier_payment` (`supplier_id`,`payment_date`),
  KEY `idx_due_date` (`due_date`),
  KEY `idx_remaining_supplier` (`remaining_amount`),
  KEY `idx_transaction_id` (`transaction_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Structure de la table `transactions`
--

DROP TABLE IF EXISTS `transactions`;
CREATE TABLE IF NOT EXISTS `transactions` (
  `id` varchar(50) NOT NULL,
  `user_id` varchar(50) DEFAULT NULL,
  `date` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `date_enregistrement` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `date_modification` timestamp NULL DEFAULT NULL,
  `type` varchar(50) NOT NULL DEFAULT 'autre',
  `statut` enum('valide','pending','porteur_pending','assoc_pending','committed') DEFAULT 'valide',
  `montant` decimal(15,2) DEFAULT NULL,
  `montant_a_payer` decimal(15,2) DEFAULT NULL COMMENT 'Montant dû au fournisseur (achat=prix_achat_total, vente=valeur_achat_xaf, paiement=montant)',
  `notes` text,
  `devise` varchar(10) DEFAULT NULL,
  `quantite` decimal(15,6) DEFAULT NULL,
  `taux_achat_unitaire` decimal(15,6) DEFAULT NULL,
  `prix_achat_total` decimal(15,2) DEFAULT NULL,
  `use_caisse` tinyint(1) DEFAULT '0',
  `ancien_cmup` decimal(15,6) DEFAULT NULL,
  `cmup_usdt` decimal(15,6) DEFAULT NULL,
  `cmup_operation` varchar(10) DEFAULT NULL,
  `nouveau_cmup` decimal(15,6) DEFAULT NULL,
  `fournisseur` varchar(100) DEFAULT NULL,
  `id_fournisseur` int DEFAULT NULL,
  `devise_vente` varchar(10) DEFAULT NULL,
  `taux_conversion` decimal(15,6) DEFAULT NULL,
  `taux_achat_xaf` decimal(15,6) DEFAULT NULL,
  `quantite_vente` decimal(15,6) DEFAULT NULL,
  `taux_vente_visible` decimal(15,6) DEFAULT NULL,
  `taux_vente_cache` decimal(15,6) DEFAULT NULL,
  `valeur_achat_xaf` decimal(15,2) DEFAULT NULL,
  `valeur_vente_visible` decimal(15,2) DEFAULT NULL,
  `valeur_vente_cachee` decimal(15,2) DEFAULT NULL,
  `benefice_visible` decimal(15,2) DEFAULT NULL,
  `benefice_cache` decimal(15,2) DEFAULT NULL,
  `part_porteur_visible` decimal(15,2) DEFAULT NULL,
  `part_porteur_cachee` decimal(15,2) DEFAULT NULL,
  `part_associe_visible` decimal(15,2) DEFAULT NULL,
  `part_associe_cachee` decimal(15,2) DEFAULT NULL,
  `pourcentage_porteur` decimal(5,2) DEFAULT NULL,
  `pourcentage_associe` decimal(5,2) DEFAULT NULL,
  `usdt_consomme` decimal(15,6) DEFAULT NULL,
  `client` varchar(100) DEFAULT NULL,
  `client_id` int DEFAULT NULL,
  `categorie` varchar(50) DEFAULT NULL,
  `beneficiaire` varchar(100) DEFAULT NULL,
  `mode_paiement` enum('XAF','USDT') DEFAULT 'XAF',
  `montant_paye` decimal(15,2) DEFAULT '0.00',
  `montant_reste` decimal(15,2) DEFAULT '0.00',
  `payment_status` enum('unpaid','partial','paid') DEFAULT 'unpaid',
  `description` text,
  `transaction_parent_id` varchar(50) DEFAULT NULL COMMENT 'ID de la transaction originale (paiements partiels)',
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  KEY `idx_date_type` (`date`,`type`),
  KEY `idx_statut_type` (`statut`,`type`),
  KEY `idx_client` (`client`),
  KEY `idx_fournisseur_id` (`id_fournisseur`),
  KEY `idx_fourn_montant` (`id_fournisseur`,`montant_a_payer`,`montant_paye`),
  KEY `idx_type_fourn` (`type`,`id_fournisseur`,`statut`),
  KEY `idx_client_type` (`client_id`,`type`,`statut`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Déclencheurs `transactions`
--
DROP TRIGGER IF EXISTS `after_achat_insert`;
DELIMITER $$
CREATE TRIGGER `after_achat_insert` AFTER INSERT ON `transactions` FOR EACH ROW BEGIN
  -- Mise à jour stock USDT
  IF NEW.type = 'achat' AND NEW.statut IN ('valide','committed') AND NEW.devise IS NOT NULL THEN
    INSERT INTO stock (devise, quantite, cmup, valeur_totale)
    VALUES (NEW.devise, COALESCE(NEW.quantite,0), COALESCE(NEW.taux_achat_unitaire,0), COALESCE(NEW.prix_achat_total,0))
    ON DUPLICATE KEY UPDATE
      cmup          = (valeur_totale + COALESCE(NEW.prix_achat_total,0)) / NULLIF(quantite + COALESCE(NEW.quantite,0), 0),
      quantite      = quantite      + COALESCE(NEW.quantite,0),
      valeur_totale = valeur_totale + COALESCE(NEW.prix_achat_total,0);
  END IF;
END
$$
DELIMITER ;
DROP TRIGGER IF EXISTS `after_vente_distribution`;
DELIMITER $$
CREATE TRIGGER `after_vente_distribution` AFTER INSERT ON `transactions` FOR EACH ROW BEGIN
  IF NEW.type = 'vente' AND NEW.statut IN ('valide','committed') THEN
    UPDATE repartition_profits
    SET
      total_accumule_visible = total_accumule_visible + COALESCE(NEW.part_porteur_visible, 0),
      total_accumule_cache   = total_accumule_cache   + COALESCE(NEW.part_porteur_cachee,  0)
    WHERE role = 'porteur';

    UPDATE repartition_profits
    SET
      total_accumule_visible = total_accumule_visible + COALESCE(NEW.part_associe_visible, 0),
      total_accumule_cache   = total_accumule_cache   + COALESCE(NEW.part_associe_cachee,  0)
    WHERE role = 'associe';

    -- Même chose pour la table distribution (double cible)
    UPDATE distribution
    SET
      total_accumule_visible = total_accumule_visible + COALESCE(NEW.part_porteur_visible, 0),
      total_accumule_cache   = total_accumule_cache   + COALESCE(NEW.part_porteur_cachee,  0)
    WHERE role = 'porteur';

    UPDATE distribution
    SET
      total_accumule_visible = total_accumule_visible + COALESCE(NEW.part_associe_visible, 0),
      total_accumule_cache   = total_accumule_cache   + COALESCE(NEW.part_associe_cachee,  0)
    WHERE role = 'associe';
  END IF;
END
$$
DELIMITER ;
DROP TRIGGER IF EXISTS `after_vente_insert`;
DELIMITER $$
CREATE TRIGGER `after_vente_insert` AFTER INSERT ON `transactions` FOR EACH ROW BEGIN
  -- Déduire du stock USDT
  IF NEW.type = 'vente' AND NEW.statut IN ('valide','committed') AND NEW.usdt_consomme IS NOT NULL THEN
    UPDATE stock
    SET
      quantite      = GREATEST(0, quantite      - COALESCE(NEW.usdt_consomme, 0)),
      valeur_totale = GREATEST(0, valeur_totale - (cmup * COALESCE(NEW.usdt_consomme, 0)))
    WHERE devise = 'USDT';
  END IF;
END
$$
DELIMITER ;

-- --------------------------------------------------------

--
-- Structure de la table `transaction_payment_details`
--

DROP TABLE IF EXISTS `transaction_payment_details`;
CREATE TABLE IF NOT EXISTS `transaction_payment_details` (
  `id` int NOT NULL AUTO_INCREMENT,
  `transaction_id` varchar(50) NOT NULL,
  `client_id` int NOT NULL,
  `original_amount` decimal(12,2) NOT NULL,
  `amount_paid` decimal(12,2) DEFAULT '0.00',
  `remaining_amount` decimal(12,2) NOT NULL,
  `payment_date` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `last_updated` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_transaction_client` (`transaction_id`,`client_id`),
  KEY `idx_client_payment` (`client_id`,`payment_date`),
  KEY `idx_remaining` (`remaining_amount`),
  KEY `idx_transaction_id` (`transaction_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Structure de la table `users`
--

DROP TABLE IF EXISTS `users`;
CREATE TABLE IF NOT EXISTS `users` (
  `id` varchar(50) NOT NULL,
  `name` varchar(100) NOT NULL,
  `email` varchar(100) NOT NULL,
  `password` varchar(255) NOT NULL,
  `role` enum('porteur','associe') NOT NULL,
  `last_login` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Déchargement des données de la table `users`
--

INSERT INTO `users` (`id`, `name`, `email`, `password`, `role`, `last_login`, `created_at`) VALUES
(1, 'C HOPE', 'chope@gmail.com', '$2a$10$VpJ3q5lddvKttSheujR5vuhvoEWlwNyiyMx0lKy0Dg75p7ZE9fTZC', 'porteur', '2026-06-09 22:20:55', '2026-06-09 22:20:37'),
(2, 'PARTNER', 'partner@gmail.com', '$2a$10$OPDf6pHV4cyXVKnUrF/esONTD01T0X6ZA58hbRBZjr.OgXlo0v9G.', 'associe', NULL, '2026-06-09 22:22:25');

--
-- Donnees minimales requises au demarrage de l'application
--

INSERT IGNORE INTO `stock` (`devise`, `quantite`, `cmup`, `valeur_totale`)
VALUES ('USDT', 0, 0, 0);

INSERT IGNORE INTO `comptes` (`type_compte`, `montant`)
VALUES
('depot', 0),
('caisse', 0),
('banque', 0);

INSERT INTO `settings` (`setting_key`, `valeur`, `description`)
VALUES
('profit_share_porteur', '70', 'Part du porteur en pourcentage'),
('profit_share_associe', '30', 'Part de l associe en pourcentage'),
('hidden_password', '1234', 'Mot de passe de la section cachee'),
('app_version', '5.8.0', 'Version applicative')
ON DUPLICATE KEY UPDATE
`valeur` = VALUES(`valeur`),
`description` = VALUES(`description`);

INSERT INTO `repartition_profits` (`role`, `pourcentage_defaut`, `distribution_active`)
VALUES
('porteur', 70.00, 0),
('associe', 30.00, 0)
ON DUPLICATE KEY UPDATE
`pourcentage_defaut` = VALUES(`pourcentage_defaut`);

-- --------------------------------------------------------

--
-- Doublure de structure pour la vue `vue_distribution_details`
-- (Voir ci-dessous la vue réelle)
--
DROP VIEW IF EXISTS `vue_distribution_details`;
CREATE TABLE IF NOT EXISTS `vue_distribution_details` (
`benefice_cache` decimal(15,2)
,`benefice_total` decimal(16,2)
,`benefice_visible` decimal(15,2)
,`client` varchar(100)
,`date` timestamp
,`devise_vente` varchar(10)
,`fournisseur_nom` varchar(100)
,`id` int
,`pourcentage` decimal(5,2)
,`quantite_vente` decimal(15,6)
,`role` enum('porteur','associe')
,`taux_vente_cache` decimal(15,6)
,`taux_vente_visible` decimal(15,6)
,`transaction_id` varchar(50)
,`type` varchar(50)
,`user_name` varchar(100)
);

-- --------------------------------------------------------

--
-- Doublure de structure pour la vue `vue_extrait_clients`
-- (Voir ci-dessous la vue réelle)
--
DROP VIEW IF EXISTS `vue_extrait_clients`;
CREATE TABLE IF NOT EXISTS `vue_extrait_clients` (
`adresse` text
,`id` int
,`nb_paiements` bigint
,`nb_ventes` bigint
,`nom` varchar(100)
,`nom_complet` varchar(201)
,`prenom` varchar(100)
,`reste` decimal(38,2)
,`solde` decimal(15,2)
,`telephone` varchar(20)
,`total_a_payer` decimal(37,2)
,`total_paye` decimal(37,2)
,`ville` varchar(100)
);

-- --------------------------------------------------------

--
-- Doublure de structure pour la vue `vue_extrait_fournisseurs`
-- (Voir ci-dessous la vue réelle)
--
DROP VIEW IF EXISTS `vue_extrait_fournisseurs`;
CREATE TABLE IF NOT EXISTS `vue_extrait_fournisseurs` (
`adresse` text
,`dette_usdt` decimal(15,6)
,`id` int
,`nb_achats` decimal(23,0)
,`nb_operations` bigint
,`nb_paiements` decimal(23,0)
,`nb_ventes` decimal(23,0)
,`nom` varchar(100)
,`nom_complet` varchar(201)
,`prenom` varchar(100)
,`reste` decimal(38,2)
,`solde_usdt` decimal(15,6)
,`solde_xaf` decimal(15,2)
,`telephone` varchar(20)
,`total_a_payer` decimal(37,2)
,`total_paye` decimal(37,2)
,`ville` varchar(100)
);

-- --------------------------------------------------------

--
-- Doublure de structure pour la vue `vue_stats_globales`
-- (Voir ci-dessous la vue réelle)
--
DROP VIEW IF EXISTS `vue_stats_globales`;
CREATE TABLE IF NOT EXISTS `vue_stats_globales` (
`benefices_caches_total` decimal(37,2)
,`benefices_visibles_total` decimal(37,2)
,`caisse` decimal(15,2)
,`cmup_usdt` decimal(15,6)
,`depot` decimal(15,2)
,`stock_usdt` decimal(15,6)
,`total_achats` decimal(23,0)
,`total_dette_fournisseurs` decimal(37,2)
,`total_paye_fournisseurs` decimal(37,2)
,`total_transactions` bigint
,`total_ventes` decimal(23,0)
);

-- --------------------------------------------------------

--
-- Doublure de structure pour la vue `vue_stats_journalier`
-- (Voir ci-dessous la vue réelle)
--
DROP VIEW IF EXISTS `vue_stats_journalier`;
CREATE TABLE IF NOT EXISTS `vue_stats_journalier` (
`benefices_caches_jour` decimal(37,2)
,`benefices_visibles_jour` decimal(37,2)
,`jour` date
,`nb_achats` decimal(23,0)
,`nb_transactions` bigint
,`nb_ventes` decimal(23,0)
,`ventes_cachees` decimal(23,0)
);

-- --------------------------------------------------------

--
-- Doublure de structure pour la vue `vue_stock_usdt`
-- (Voir ci-dessous la vue réelle)
--
DROP VIEW IF EXISTS `vue_stock_usdt`;
CREATE TABLE IF NOT EXISTS `vue_stock_usdt` (
`cmup` decimal(15,6)
,`devise` varchar(10)
,`quantite` decimal(15,6)
,`updated_at` timestamp
,`valeur_totale` decimal(15,2)
);

-- --------------------------------------------------------

--
-- Doublure de structure pour la vue `vue_transactions_completes`
-- (Voir ci-dessous la vue réelle)
--
DROP VIEW IF EXISTS `vue_transactions_completes`;
CREATE TABLE IF NOT EXISTS `vue_transactions_completes` (
`ancien_cmup` decimal(15,6)
,`benefice_cache` decimal(15,2)
,`benefice_visible` decimal(15,2)
,`beneficiaire` varchar(100)
,`categorie` varchar(50)
,`client` varchar(100)
,`client_id` int
,`client_nom` varchar(100)
,`client_nom_complet` varchar(201)
,`date` timestamp
,`date_enregistrement` timestamp
,`date_modification` timestamp
,`devise` varchar(10)
,`devise_vente` varchar(10)
,`fournisseur` varchar(100)
,`fournisseur_nom` varchar(100)
,`id` varchar(50)
,`id_fournisseur` int
,`mode_paiement` enum('XAF','USDT')
,`montant` decimal(15,2)
,`montant_a_payer` decimal(15,2)
,`montant_paye` decimal(15,2)
,`montant_reste` decimal(16,2)
,`notes` text
,`nouveau_cmup` decimal(15,6)
,`part_associe_cachee` decimal(15,2)
,`part_associe_visible` decimal(15,2)
,`part_porteur_cachee` decimal(15,2)
,`part_porteur_visible` decimal(15,2)
,`payment_status` varchar(7)
,`pourcentage_associe` decimal(5,2)
,`pourcentage_porteur` decimal(5,2)
,`prix_achat_total` decimal(15,2)
,`quantite` decimal(15,6)
,`quantite_vente` decimal(15,6)
,`statut` enum('valide','pending','porteur_pending','assoc_pending','committed')
,`taux_achat_unitaire` decimal(15,6)
,`taux_achat_xaf` decimal(15,6)
,`taux_conversion` decimal(15,6)
,`taux_vente_cache` decimal(15,6)
,`taux_vente_visible` decimal(15,6)
,`type` varchar(50)
,`usdt_consomme` decimal(15,6)
,`use_caisse` tinyint(1)
,`user_id` varchar(50)
,`user_name` varchar(100)
,`user_role` enum('porteur','associe')
,`valeur_achat_xaf` decimal(15,2)
,`valeur_vente_cachee` decimal(15,2)
,`valeur_vente_visible` decimal(15,2)
);

-- --------------------------------------------------------

--
-- Structure de la vue `vue_distribution_details`
--
DROP TABLE IF EXISTS `vue_distribution_details`;

DROP VIEW IF EXISTS `vue_distribution_details`;
CREATE VIEW `vue_distribution_details`  AS SELECT `dp`.`id` AS `id`, `dp`.`transaction_id` AS `transaction_id`, `t`.`date` AS `date`, `t`.`type` AS `type`, `t`.`devise_vente` AS `devise_vente`, `t`.`quantite_vente` AS `quantite_vente`, `t`.`taux_vente_visible` AS `taux_vente_visible`, `t`.`taux_vente_cache` AS `taux_vente_cache`, `dp`.`role` AS `role`, `dp`.`benefice_visible` AS `benefice_visible`, `dp`.`benefice_cache` AS `benefice_cache`, `dp`.`pourcentage` AS `pourcentage`, (`dp`.`benefice_visible` + coalesce(`dp`.`benefice_cache`,0)) AS `benefice_total`, `u`.`name` AS `user_name`, `t`.`client` AS `client`, coalesce(`cf`.`nom`,`t`.`fournisseur`) AS `fournisseur_nom` FROM (((`distribution_partenaires` `dp` left join `transactions` `t` on((`dp`.`transaction_id` = `t`.`id`))) left join `users` `u` on((`t`.`user_id` = `u`.`id`))) left join `comptes_fournisseurs` `cf` on((`t`.`id_fournisseur` = `cf`.`id`))) WHERE (`t`.`statut` in ('valide','committed')) ORDER BY `t`.`date` DESC ;

-- --------------------------------------------------------

--
-- Structure de la vue `vue_extrait_clients`
--
DROP TABLE IF EXISTS `vue_extrait_clients`;

DROP VIEW IF EXISTS `vue_extrait_clients`;
CREATE VIEW `vue_extrait_clients`  AS SELECT `cc`.`id` AS `id`, `cc`.`nom` AS `nom`, `cc`.`prenom` AS `prenom`, concat(`cc`.`nom`,if(((`cc`.`prenom` is not null) and (`cc`.`prenom` <> '')),concat(' ',`cc`.`prenom`),'')) AS `nom_complet`, `cc`.`ville` AS `ville`, `cc`.`adresse` AS `adresse`, `cc`.`telephone` AS `telephone`, `cc`.`solde` AS `solde`, count(distinct (case when (`t`.`type` = 'vente') then `t`.`id` end)) AS `nb_ventes`, count(distinct (case when (`t`.`type` = 'paiement_client') then `t`.`id` end)) AS `nb_paiements`, ifnull(sum((case when ((`t`.`type` = 'vente') and (`t`.`statut` in ('committed','porteur_pending','assoc_pending'))) then coalesce(`t`.`montant_a_payer`,`t`.`valeur_vente_visible`,0) else 0 end)),0) AS `total_a_payer`, ifnull(sum((case when ((`t`.`type` = 'paiement_client') and (`t`.`statut` = 'committed')) then coalesce(`t`.`montant_paye`,0) else 0 end)),0) AS `total_paye`, (ifnull(sum((case when ((`t`.`type` = 'vente') and (`t`.`statut` in ('committed','porteur_pending','assoc_pending'))) then coalesce(`t`.`montant_a_payer`,`t`.`valeur_vente_visible`,0) else 0 end)),0) - ifnull(sum((case when ((`t`.`type` = 'paiement_client') and (`t`.`statut` = 'committed')) then coalesce(`t`.`montant_paye`,0) else 0 end)),0)) AS `reste` FROM (`comptes_clients` `cc` left join `transactions` `t` on((((`t`.`client_id` = `cc`.`id`) or (find_in_set(trim(concat(`cc`.`nom`,if(((`cc`.`prenom` is not null) and (`cc`.`prenom` <> '')),concat(' ',`cc`.`prenom`),''))),`t`.`client`) > 0)) and (`t`.`type` in ('vente','paiement_client'))))) GROUP BY `cc`.`id`, `cc`.`nom`, `cc`.`prenom`, `cc`.`ville`, `cc`.`adresse`, `cc`.`telephone`, `cc`.`solde` ;

-- --------------------------------------------------------

--
-- Structure de la vue `vue_extrait_fournisseurs`
--
DROP TABLE IF EXISTS `vue_extrait_fournisseurs`;

DROP VIEW IF EXISTS `vue_extrait_fournisseurs`;
CREATE VIEW `vue_extrait_fournisseurs`  AS SELECT `cf`.`id` AS `id`, `cf`.`nom` AS `nom`, `cf`.`prenom` AS `prenom`, concat(`cf`.`nom`,if(((`cf`.`prenom` is not null) and (`cf`.`prenom` <> '')),concat(' ',`cf`.`prenom`),'')) AS `nom_complet`, `cf`.`ville` AS `ville`, `cf`.`adresse` AS `adresse`, `cf`.`telephone` AS `telephone`, `cf`.`solde_xaf` AS `solde_xaf`, `cf`.`solde_usdt` AS `solde_usdt`, `cf`.`dette_usdt` AS `dette_usdt`, count(`t`.`id`) AS `nb_operations`, sum((case when (`t`.`type` = 'achat') then 1 else 0 end)) AS `nb_achats`, sum((case when (`t`.`type` = 'vente') then 1 else 0 end)) AS `nb_ventes`, sum((case when (`t`.`type` = 'paiement_fournisseur') then 1 else 0 end)) AS `nb_paiements`, ifnull(sum((case when ((`t`.`type` in ('achat','vente')) and (`t`.`statut` = 'committed')) then `t`.`montant_a_payer` else 0 end)),0) AS `total_a_payer`, ifnull(sum((case when ((`t`.`type` = 'paiement_fournisseur') and (`t`.`statut` = 'committed')) then coalesce(`t`.`montant_paye`,0) else 0 end)),0) AS `total_paye`, (ifnull(sum((case when ((`t`.`type` in ('achat','vente')) and (`t`.`statut` = 'committed')) then `t`.`montant_a_payer` else 0 end)),0) - ifnull(sum((case when ((`t`.`type` = 'paiement_fournisseur') and (`t`.`statut` = 'committed')) then coalesce(`t`.`montant_paye`,0) else 0 end)),0)) AS `reste` FROM (`comptes_fournisseurs` `cf` left join `transactions` `t` on(((`t`.`id_fournisseur` = `cf`.`id`) or ((`t`.`type` = 'achat') and (`t`.`statut` = 'committed') and (trim(`t`.`fournisseur`) = trim(concat(`cf`.`nom`,if(((`cf`.`prenom` is not null) and (`cf`.`prenom` <> '')),concat(' ',`cf`.`prenom`),'')))))))) GROUP BY `cf`.`id`, `cf`.`nom`, `cf`.`prenom`, `cf`.`ville`, `cf`.`adresse`, `cf`.`telephone`, `cf`.`solde_xaf`, `cf`.`solde_usdt`, `cf`.`dette_usdt` ;

-- --------------------------------------------------------

--
-- Structure de la vue `vue_stats_globales`
--
DROP TABLE IF EXISTS `vue_stats_globales`;

DROP VIEW IF EXISTS `vue_stats_globales`;
CREATE VIEW `vue_stats_globales`  AS SELECT (select `comptes`.`montant` from `comptes` where (`comptes`.`type_compte` = 'caisse')) AS `caisse`, (select `comptes`.`montant` from `comptes` where (`comptes`.`type_compte` = 'depot')) AS `depot`, (select `stock`.`quantite` from `stock` where (`stock`.`devise` = 'USDT')) AS `stock_usdt`, (select `stock`.`cmup` from `stock` where (`stock`.`devise` = 'USDT')) AS `cmup_usdt`, count(0) AS `total_transactions`, sum((case when (`transactions`.`type` = 'achat') then 1 else 0 end)) AS `total_achats`, sum((case when (`transactions`.`type` = 'vente') then 1 else 0 end)) AS `total_ventes`, ifnull(sum(coalesce(`transactions`.`benefice_visible`,0)),0) AS `benefices_visibles_total`, ifnull(sum(coalesce(`transactions`.`benefice_cache`,0)),0) AS `benefices_caches_total`, ifnull((select sum(`transactions`.`montant_a_payer`) from `transactions` where ((`transactions`.`type` in ('achat','vente')) and (`transactions`.`id_fournisseur` is not null) and (`transactions`.`statut` = 'committed'))),0) AS `total_dette_fournisseurs`, ifnull((select sum(coalesce(`transactions`.`montant_paye`,0)) from `transactions` where ((`transactions`.`type` = 'paiement_fournisseur') and (`transactions`.`statut` = 'committed'))),0) AS `total_paye_fournisseurs` FROM `transactions` WHERE (`transactions`.`statut` in ('valide','committed')) ;

-- --------------------------------------------------------

--
-- Structure de la vue `vue_stats_journalier`
--
DROP TABLE IF EXISTS `vue_stats_journalier`;

DROP VIEW IF EXISTS `vue_stats_journalier`;
CREATE VIEW `vue_stats_journalier`  AS SELECT cast(`transactions`.`date` as date) AS `jour`, count(0) AS `nb_transactions`, sum((case when (`transactions`.`type` = 'vente') then 1 else 0 end)) AS `nb_ventes`, sum((case when (`transactions`.`type` = 'achat') then 1 else 0 end)) AS `nb_achats`, sum(coalesce(`transactions`.`benefice_visible`,0)) AS `benefices_visibles_jour`, sum(coalesce(`transactions`.`benefice_cache`,0)) AS `benefices_caches_jour`, sum((case when ((`transactions`.`taux_vente_cache` is not null) and (`transactions`.`taux_vente_cache` > 0)) then 1 else 0 end)) AS `ventes_cachees` FROM `transactions` WHERE (`transactions`.`statut` in ('valide','committed')) GROUP BY cast(`transactions`.`date` as date) ORDER BY `jour` DESC ;

-- --------------------------------------------------------

--
-- Structure de la vue `vue_stock_usdt`
--
DROP TABLE IF EXISTS `vue_stock_usdt`;

DROP VIEW IF EXISTS `vue_stock_usdt`;
CREATE VIEW `vue_stock_usdt`  AS SELECT `stock`.`devise` AS `devise`, `stock`.`quantite` AS `quantite`, `stock`.`cmup` AS `cmup`, `stock`.`valeur_totale` AS `valeur_totale`, `stock`.`updated_at` AS `updated_at` FROM `stock` ;

-- --------------------------------------------------------

--
-- Structure de la vue `vue_transactions_completes`
--
DROP TABLE IF EXISTS `vue_transactions_completes`;

DROP VIEW IF EXISTS `vue_transactions_completes`;
CREATE VIEW `vue_transactions_completes`  AS SELECT `t`.`id` AS `id`, `t`.`user_id` AS `user_id`, `t`.`date` AS `date`, `t`.`date_enregistrement` AS `date_enregistrement`, `t`.`date_modification` AS `date_modification`, `t`.`type` AS `type`, `t`.`statut` AS `statut`, `t`.`montant` AS `montant`, `t`.`montant_a_payer` AS `montant_a_payer`, `t`.`notes` AS `notes`, `t`.`devise` AS `devise`, `t`.`quantite` AS `quantite`, `t`.`taux_achat_unitaire` AS `taux_achat_unitaire`, `t`.`prix_achat_total` AS `prix_achat_total`, `t`.`use_caisse` AS `use_caisse`, `t`.`ancien_cmup` AS `ancien_cmup`, `t`.`cmup_usdt` AS `cmup_usdt`, `t`.`cmup_operation` AS `cmup_operation`, `t`.`nouveau_cmup` AS `nouveau_cmup`, `t`.`fournisseur` AS `fournisseur`, `t`.`id_fournisseur` AS `id_fournisseur`, `t`.`devise_vente` AS `devise_vente`, `t`.`taux_conversion` AS `taux_conversion`, `t`.`taux_achat_xaf` AS `taux_achat_xaf`, `t`.`quantite_vente` AS `quantite_vente`, `t`.`taux_vente_visible` AS `taux_vente_visible`, `t`.`taux_vente_cache` AS `taux_vente_cache`, `t`.`valeur_achat_xaf` AS `valeur_achat_xaf`, `t`.`valeur_vente_visible` AS `valeur_vente_visible`, `t`.`valeur_vente_cachee` AS `valeur_vente_cachee`, `t`.`benefice_visible` AS `benefice_visible`, `t`.`benefice_cache` AS `benefice_cache`, `t`.`part_porteur_visible` AS `part_porteur_visible`, `t`.`part_porteur_cachee` AS `part_porteur_cachee`, `t`.`part_associe_visible` AS `part_associe_visible`, `t`.`part_associe_cachee` AS `part_associe_cachee`, `t`.`pourcentage_porteur` AS `pourcentage_porteur`, `t`.`pourcentage_associe` AS `pourcentage_associe`, `t`.`usdt_consomme` AS `usdt_consomme`, `t`.`client` AS `client`, `t`.`client_id` AS `client_id`, `t`.`categorie` AS `categorie`, `t`.`beneficiaire` AS `beneficiaire`, `t`.`mode_paiement` AS `mode_paiement`, `t`.`montant_paye` AS `montant_paye`, (coalesce(`t`.`montant_a_payer`,0) - coalesce(`t`.`montant_paye`,0)) AS `montant_reste`, (case when (coalesce(`t`.`montant_paye`,0) <= 0) then 'unpaid' when (coalesce(`t`.`montant_paye`,0) >= coalesce(`t`.`montant_a_payer`,0)) then 'paid' else 'partial' end) AS `payment_status`, `u`.`name` AS `user_name`, `u`.`role` AS `user_role`, `cc`.`nom` AS `client_nom`, concat(coalesce(`cc`.`nom`,''),if((`cc`.`prenom` is not null),concat(' ',`cc`.`prenom`),'')) AS `client_nom_complet`, `cf`.`nom` AS `fournisseur_nom` FROM (((`transactions` `t` left join `users` `u` on((`t`.`user_id` = `u`.`id`))) left join `comptes_clients` `cc` on((`t`.`client_id` = `cc`.`id`))) left join `comptes_fournisseurs` `cf` on((`t`.`id_fournisseur` = `cf`.`id`))) ;

--
-- Contraintes pour les tables déchargées
--

--
-- Contraintes pour la table `distribution_partenaires`
--
ALTER TABLE `distribution_partenaires`
  ADD CONSTRAINT `distribution_partenaires_ibfk_1` FOREIGN KEY (`transaction_id`) REFERENCES `transactions` (`id`) ON DELETE CASCADE;

--
-- Contraintes pour la table `transactions`
--
ALTER TABLE `transactions`
  ADD CONSTRAINT `transactions_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `transactions_ibfk_2` FOREIGN KEY (`client_id`) REFERENCES `comptes_clients` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `transactions_ibfk_3` FOREIGN KEY (`id_fournisseur`) REFERENCES `comptes_fournisseurs` (`id`) ON DELETE SET NULL;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;



