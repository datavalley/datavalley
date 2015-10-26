---
layout: post
title:  "Hive:JOIN原理、JOIN优化与执行计划"
keywords: "hive"
description: "JOIN基本原理，各种JOIN的区别，JOIN优化，hive执行计划"
category: Hive
tags: [hive join]
---

# 1. Join的基本原理

大家都知道，Hive会将所有的SQL查询转化为Map/Reduce作业运行于Hadoop集群之上。在这里简要介绍Hive将Join转化为Map/Reduce的基本原理（其它查询的原理请参考[这里](http://tech.meituan.com/hive-sql-to-mapreduce.html)）。

假定有user和order两张表，分别如下：

user表：

| sid | name |
| --- | --- |
| 1 | apple |
| 2 | orange |

order表：

| uid | orderid |
| --- | --- |
| 1 | 1001 |
| 1 | 1002 |
| 2 | 1003 |

现在想做student和sc两张表上的连接操作：

```SQL
SELECT
  u.name,
  o.orderid
FROM user u
JOIN order o ON u.uid = o.uid;
```

Hive是利用hadoop的Map/Reduce计算框架执行上述查询的呢？？

Hive会将出现在连接条件ON之后的所有字段作为Map输出的key，将所需的字段作为value，构建(key, value)，同时为每张表打上不同的标记tag，输出到Reduce端。在Reduce端，根据tag区分参与连接的表，实现连接操作。

我们使用下图来模拟这个过程：

![join原理图](http://tech.meituan.com/img/hive/join.png)

在Map端分别扫描user和order的两张表。对于user表，在连接条件ON之后的字段为uid，所以以uid作为Map输出的key，在SELECT语句中还需要name字段，所以name字段作为value的一部分，同时为user表赋予标记tag=1，这样处理user表的mapper地输出形式为：(uid, "1" + name)。类似的，处理order表的mapper地输出形式为：(uid, "2" + orderid)，注意，order表的标记为2。

具有相同uid的地(key, value)字段在reduce端“集合”，根据value中tag字段区分来自不同表的数据，使用两层循环完成连接操作。

上面就是将Join操作转换为Map/Reduce作业的基本原理： 在map端扫描表，在reduce端完成连接操作。

# 2. Hive中的各种Join

我们使用例子讲述各种Join的区别。假设user和order两张表的数据变为：

user表：

| sid | name |
| --- | --- |
| 1 | apple |
| 2 | orange |
| 3 | banana |

order表：

| uid | orderid |
| --- | --- |
| 1 | 1001 |
| 1 | 1002 |
| 2 | 1003 |
| 4 | 2001 |

>“不要考虑例子在现实中的意义，这里这是为了演示各种JOIN的区别”

## INNER JOIN

## 2.1 LEFT OUTER JOIN

## OUTER JOIN

## 2.2 RIGHT OUTER JOIN

## 2.3 FULL OUTER JOIN

## 2.4 LEFT SMEI JOIN

# 3. 执行计划总结

## 参考资料

[1]. http://tech.meituan.com/hive-sql-to-mapreduce.html