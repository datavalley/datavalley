---
layout: post
title:  "Scala学习笔记之implicit隐式转换"
keywords: "scala"
description: "Scala学习笔记之implicit隐式转换"
category: scala
tags: [scala]
---

在编程语言中，经常会遇到类型转换的情形，有些类型转换是显式的，而有些类型转换是隐式的，例如：```2 + 3.14f```，这里编译器就会将整型隐式的转换为浮点型，然后再完成求和运算。


在Scala中，implicit有两个用途：
 
+ 完成隐式的类型转换
+ 在不改变已有类型定义的前提下，为类添加新的方法



## 1. 隐式转换

在scala中，隐式转换是通过**implicit**实现的，我们先来看一个小栗子：

+ 例1

```scala
scala> implicit def foo(s: String): Int = Integer.parseInt(s) // 自动将String对象转换为Integer对象
warning: there was one feature warning; re-run with -feature for details
foo: (s: String)Int

scala> def add(a: Int, b: Int): Int = a + b   // 两个整数求和
add: (a: Int, b: Int)Int

scala> add("123", 1)   // 自动调用foo函数，完成String到Integer的转换
res0: Int = 124
```

在上面的例子中，

1. 函数foo会将字符串解析为整型，但该函数的调用是编译器自动完成的，无需显式的调用；
2. 函数add接受两个int参数，完成求和运算；
3. ```add("123", 1)```，由于add两个参数为整型，所以编译器自动寻找有无```implicit def xx(String)=Int```这样的函数完成类型转换，如果有，则隐式的调用，从而完成从String到Int的转换，本例中的隐式转换函数为```foo```


## 2. 对已有类添加新方法

+ 例2

```scala
scala> val list = List(1, 2, 3, 4)  // 定义整型List
list: List[Int] = List(1, 2, 3, 4)

scala> list.join("-")          //原生List类并没有join方法
<console>:12: error: value join is not a member of List[Int]
       list.join("-")
            ^
scala> implicit def foo2[T](list: List[T]) = new {  // 定义隐式类型转换类foo2，将List实例转换为“匿名类”的实例，该匿名类具有join方法
        def join(s: String): String = {
          list.mkString(s)
        }
      }
warning: there was one feature warning; re-run with -feature for details
foo2: [T](list: List[T])AnyRef{def join(s: String): String}

scala> list.join("-")   // 编译器自动调用foo2，完成类型转换
warning: there was one feature warning; re-run with -feature for details
res1: String = 1-2-3-4
```

在scala中，原生的List类并没有join方法，但上面使用implicit定义了```foo2```函数，该函数的函数体重定义了一个匿名类，并返回该匿名类的一个实例，在匿名类中定义了join方法。

在例2中可以看到，我们并没有修改List的定义就为所有的List实例添加了join方法。

## 3. implicit的作用范围

编译器只会在当前作用域去查找合适的implicit完成隐式类型转换。如果需要不在当前作用域内的implicit，则需要将其引入。

比如说，对于一个函数库来说，在一个 Preamble 对象中定义一些常用的隐式类型转换非常常见，因此需要使用 Preamble 的代码可以使用```import Preamble._``` 把这些 implicit 定义引入到当前作用域才可以。

一个特殊的例子是，编译器会在伴生对象中查找所需的implicit定义，例如：

+ 例3

```scala
object Dollar {
    implicit def dollarToEuro(x:Dollar):Euro = ...
    ...
}

class Dollar {
   ...
}
```

如果在 class Dollar 的方法有需要 Euro 类型，但输入数据使用的是 Dollar，编译器会在其伴生对象 object Dollar 查找所需的隐式类型转换，即：dollarToEuro，其完成Dollar到Euro的隐式转换。

## 4. 更多的例子

+ 例4，定义 '?:'

```scala
scala> implicit def elvisOperator[T](alt: T) = new {  // 使用泛型，alt的类型为T
       def ?: [A >: T] (pred: A) = {         // A是T的上界
         println("pred:" + pred)   
         println("alt:" + alt)
         if(pred == null) alt else pred
       }
     }
warning: there was one feature warning; re-run with -feature for details
elvisOperator: [T](alt: T)AnyRef{def ?:[A >: T](pred: A): A}

scala> 10 ?: 1
warning: there was one feature warning; re-run with -feature for details
pred:10       
alt:1      // 从这里可以看出，首先对1调用函数elvisOperator，返回匿名类的一个实例，然后调用该实例的'?:'方法
res6: Int = 10
```

**<font color='red'>注意'?:'方法的结合顺序</font>**

+ 例5，定义阶乘'!'

```scala
scala> class Factorial(n: Int){
        def ! = (1 to n).reduceLeft(_ * _)
      }
defined class Factorial

scala> implicit def foo3(n: Int) = new Factorial(n)
warning: there was one feature warning; re-run with -feature for details
foo2: (n: Int)Factorial

scala> 4!
warning: there was one feature warning; re-run with -feature for details
res0: Int = 24
```

在例5中，定义了Factorial类，该类的主构造函数接收一个整型变量，该类还对'!'进行了运算符重载，对整数求阶乘。

函数foo3自动将整型实例转换为Factorial实例，因此，执行```4!```时，首先使用4生成一个Factorial实例，然后调用该实例的'!'运算。

---

### 参考链接

1. [使用 implicits 的一些规则](http://wiki.jikexueyuan.com/project/scala-implicit/use-implicits.html)
2. [Scala 2.8+ Handbook](http://qiujj.com/static/Scala-Handbook.htm)
