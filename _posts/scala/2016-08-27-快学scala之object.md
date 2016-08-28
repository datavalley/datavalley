---
layout: post
title:  "快学scala之object"
keywords: "scala"
description: "快学scala之object"
category: scala
tags: [scala, class]
---

## 1. 单例对象

```scala
/**
 * 单例对象
 */
object Accounts{
  private var lastNumber = 0; // 初始化

  /**
   * 求唯一编号
   * @return
   */
  def newUniqueNumber(): Int = {
    lastNumber += 1;
    lastNumber
  }
}

object Main extends App{
  println(Accounts.newUniqueNumber())
}
```

在scala中，object可以扩展其他类和特质，与类的唯一不同在于：**object没有构造函数**。object定义了某个类的单例。

使用```javap``` 对上述 ```Accounts``` 类进行反编译：

```scala
public final class class_chapter.Accounts {
  public static int newUniqueNumber();
}
```

可以看到，```Accounts``` 的方法```newUniqueNumber``` 为静态函数(```static```)。

object的基本用法：

1. 存放静态方法和常量
2. 高效的共享单个不可变的实例
3. 单例

## 2. 伴生对象

伴生object，是指与某个类同名的object。在Java中，某些类可以拥有静态方法和静态属性，但在scala中并没有静态方法和静态属性。那怎么解决这个问题呢？？ 

要解决这个问题，就用到了伴生对象。静态方法和静态属性可以放到与类同名的伴生object中。

```scala
object Accounts{
  private var lastNumber = 0; // 初始化

  /**
   * 求唯一编号
   * @return
   */
  def newUniqueNumber(): Int = {
    lastNumber += 1;
    lastNumber
  }
}

class Accounts{
  private val id = Accounts.newUniqueNumber() // 伴生对象中的静态方法
  private var balance = 0.0
  def deposit(amount: Double): Unit ={
    balance += amount
  }
}
```

说明：伴生object和伴生类可以互相访问私有变量

## 3. ```apply()``` 方法

```apply()```  方法多位于伴生object中，调用形式为：

```scala
Object(arg1, arg2, ...)
```

```apply()``` 常常返回**伴生类**的实例。使用举例：


```scala
object Accounts{
  private var lastNumber = 0; // 初始化

  /**
   * 求唯一编号
   * @return
   */
  def newUniqueNumber(): Int = {
    lastNumber += 1;
    lastNumber
  }

  def apply(initialBalance: Double) = new Accounts(newUniqueNumber(), initialBalance)
}

/**
 * 主构造函数为private，且没有辅助构造函数，所以不能通过new来新建实例
 * @param id
 * @param initialBalance
 */
class Accounts  private (val id: Int, initialBalance: Double){
  var balance = initialBalance
}

object Main extends App{
  val acct = Accounts(1.0)
  println(acct.balance)
}
```

类```Accounts``` 不能通过```new```新建实例，但是伴生object提供了 ```apply()``` 方法，```Accounts(1.0)``` 实际调用的就是伴生类的```apply()```方法。我们对```Accounts```类进行反编译：

```scala
public class object_chapter.Accounts {
  private final int id;
  private double balance;
  public static object_chapter.Accounts apply(double);
  public static int newUniqueNumber();
  public int id();
  public double balance();
  public void balance_$eq(double);
  public object_chapter.Accounts(int, double);
}
```

可以看出，scala的编译器已经将伴生object的```apply()``` 方法和```newUniqueNumber()``` 方法封装到```Accounts```类中，修饰符为```static```。
